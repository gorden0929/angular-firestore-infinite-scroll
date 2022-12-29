import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HttpClient } from '@angular/common/http';
import { Pagination } from './pagination.class';
import { of, switchMap, take } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent extends Pagination {
  title = 'angular-firestore-infinite-scroll';
  constructor(afs: AngularFirestore, private http: HttpClient) {
    super(afs, {
      path: 'users',
      field: 'name',
      limit: 30,
    });
  }

  scrollHandler(e: 'top' | 'bottom') {
    if (e === 'bottom') {
      this.loadMore();
    }
  }

  async add() {
    this.http.get('https://randomuser.me/api/').pipe(
      take(1),
      switchMap((res: any) => {
        return this.afs.collection('users').add(res.results[0]);
      })
    ).subscribe();
  }

  async add100() {
    this.http.get('https://randomuser.me/api/?results=100').pipe(
      take(1),
      switchMap((res: any) => {
        const batch = this.afs.collection('users').ref.firestore.batch();
        res.results.forEach((user: any) => {
          const ref = this.afs.collection('users').ref.doc();
          batch.set(ref, user);
        });
        return of(batch.commit());
      })
    ).subscribe();
  }

  reset() {
    this.resetPagination();
  }
}
