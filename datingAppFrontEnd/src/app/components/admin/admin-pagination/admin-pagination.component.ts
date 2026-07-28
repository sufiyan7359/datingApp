import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-admin-pagination',
  templateUrl: './admin-pagination.component.html',
  styleUrls: ['./admin-pagination.component.css'],
  imports: [NgIf],
})
export class AdminPaginationComponent {
  @Input({ required: true }) page = 1;
  @Input({ required: true }) limit = 20;
  @Input({ required: true }) total = 0;
  @Output() readonly pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  get rangeStart(): number {
    return this.total === 0 ? 0 : (this.page - 1) * this.limit + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.limit, this.total);
  }

  prev(): void {
    if (this.page > 1) this.pageChange.emit(this.page - 1);
  }

  next(): void {
    if (this.page < this.totalPages) this.pageChange.emit(this.page + 1);
  }
}
