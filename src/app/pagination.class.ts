import { AngularFirestore, AngularFirestoreCollection, QueryDocumentSnapshot } from '@angular/fire/compat/firestore';
import { BehaviorSubject, Observable, scan, take, tap } from 'rxjs';

interface QueryConfig {
  path: string; //  path to collection
  field: string; // field to orderBy
  limit: number; // limit per query
  reverse?: boolean; // reverse order?
  prepend?: boolean; // prepend to source?
};

export type DataSubject<T> = T & { doc: QueryDocumentSnapshot<T>, id: string };

export class Pagination<T = any> {

  // Source data
  private _done = new BehaviorSubject(false);
  private _loading = new BehaviorSubject(false);
  private _data = new BehaviorSubject<DataSubject<T>[]>([]);

  private query: QueryConfig;

  // Observable data
  data$!: Observable<DataSubject<T>[]>;
  done$: Observable<boolean> = this._done.asObservable();
  loading$: Observable<boolean> = this._loading.asObservable();

  constructor(protected afs: AngularFirestore, query: QueryConfig) {
    this.query = {
      reverse: false,
      prepend: false,
      ...query
    };
    this.paginationInit();
  }

  private paginationInit() {
    const first = this.afs.collection<T>(this.query.path, ref => {
      return ref
        .orderBy(this.query.field, this.query.reverse ? 'desc' : 'asc')
        .limit(this.query.limit);
    });

    this.mapAndUpdate(first);

    this.data$ = this._data.asObservable().pipe(
      scan((acc, val) => {
        return this.query.prepend ? val.concat(acc) : acc.concat(val);
      })
    );
  }

  resetPagination(query?: Partial<QueryConfig>) {
    if (query) {
      this.query = {
        ...this.query,
        ...query
      };
    }
    this._done.next(false);
    this._loading.next(false);
    this._data.next([]);
    this.paginationInit();
  }

  loadMore() {
    const cursor = this.getCursor();

    const more = this.afs.collection<T>(this.query.path, ref => {
      return ref
        .orderBy(this.query.field, this.query.reverse ? 'desc' : 'asc')
        .limit(this.query.limit)
        .startAfter(cursor)
    });
    this.mapAndUpdate(more);
  }

  private getCursor() {
    const current = this._data.value;
    if (current.length) {
      return this.query.prepend ? current[0].doc : current[current.length - 1].doc
    }
    return null;
  }

  private mapAndUpdate(col: AngularFirestoreCollection<T>) {

    if (this._done.value || this._loading.value) { return; }

    // loading
    this._loading.next(true);

    // Map snapshot with doc ref (needed for cursor)
    return col.snapshotChanges().pipe(

      tap(arr => {
        let values = arr.map(snap => {
          const data = snap.payload.doc.data();
          const id = snap.payload.doc.id;
          const doc = snap.payload.doc;
          return { ...data, id, doc };
        });

        // If prepending, reverse the batch order
        values = this.query.prepend ? values.reverse() : values;

        // update source with new values, done loading
        this._data.next(values);
        this._loading.next(false);

        // no more values, mark done
        if (!values.length || (values.length < this.query.limit)) {
          this._done.next(true);
        }
      }),
      take(1)
    ).subscribe();
  }
}