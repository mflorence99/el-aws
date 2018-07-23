import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBStateModel } from '../state/ddb';
import { Input } from '@angular/core';
import { Scheme } from '../state/ddbschemas';
import { Store } from '@ngxs/store';
import { UpdateSort } from '../state/ddbviews';
import { View } from '../state/ddbviews';

/**
 * Column component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-column',
  styleUrls: ['column.scss'],
  templateUrl: 'column.html'
})

export class ColumnComponent {

  @Input() ddb = { } as DDBStateModel;
  @Input() ddbview = { } as View;
  @Input() scheme = { } as Scheme;

  schemes: Scheme[] = [];

  /** ctor */
  constructor(private store: Store) { }

  // event handlers

  onSortChange(sortColumn: string): void {
    let sortDir = 1;
    if (this.ddbview.sortColumn === sortColumn)
      sortDir = this.ddbview.sortDir * -1;
      const tableName = this.ddb.table.TableName;
    this.store.dispatch(new UpdateSort({ sortColumn, sortDir, tableName }));
  }

}

