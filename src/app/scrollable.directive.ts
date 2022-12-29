import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appScrollable]'
})
export class ScrollableDirective {

  @Output() scrollPosition = new EventEmitter<'top' | 'bottom'>();

  constructor(public el: ElementRef<HTMLElement>) { }

  @HostListener('scroll', ['$event'])
  onScroll(event: Event) {
    try {
      const target = event.target as HTMLElement;
      const top = target.scrollTop;
      const height = this.el.nativeElement.scrollHeight;
      const offset = this.el.nativeElement.offsetHeight;

      // emit bottom event
      if (top > height - offset - 1) {
        this.scrollPosition.emit('bottom');
      }

      // emit top event
      if (top === 0) {
        this.scrollPosition.emit('top');
      }

    } catch (err) { }
  }

}
