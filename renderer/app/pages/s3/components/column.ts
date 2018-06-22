import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { Dictionary } from '../services/dictionary';
import { Input } from '@angular/core';
import { S3ViewStateModel } from '../state/s3view';
import { Store } from '@ngxs/store';
import { UpdateSort } from '../state/s3view';

/**
 * Column component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-column',
  templateUrl: 'column.html',
  styleUrls: ['column.scss']
})

export class ColumnComponent {

  @Input() entry = { } as Dictionary;
  @Input() view = { } as S3ViewStateModel;

  /** ctor */
  constructor(private store: Store) { }

  // event handlers

  onSortChange(sortColumn: string): void {
    let sortDir = 1;
    if (this.view.sortColumn === sortColumn)
      sortDir = this.view.sortDir * -1;
    this.store.dispatch(new UpdateSort({ sortColumn, sortDir}));
  }

}
