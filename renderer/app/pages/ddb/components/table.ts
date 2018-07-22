import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBStateModel } from '../state/ddb';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { PrefsStateModel } from '../../../state/prefs';
import { Schema } from '../state/ddbschemas';
import { View } from '../state/ddbviews';

/**
 * DDB table component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-table',
  styleUrls: ['table.scss'],
  templateUrl: 'table.html'
})

export class TableComponent extends LifecycleComponent {

  @Input() ddb = { } as DDBStateModel;
  @Input() ddbschema = { } as Schema;
  @Input() ddbview = { } as View;
  @Input() prefs = { } as PrefsStateModel;

  /** Rows loading? */
  isLoadingRows(): boolean {
    return this.isTableSelected() && !this.ddb.rows;
  }

  /** Empty table (or all data filtered out)? */
  isTableEmpty(): boolean {
    return this.isTableSelected() && !!this.ddb.rows && (this.ddb.rows.length === 0);
  }

  /** Non-empty table? */
  isTablePopulated(): boolean {
    return this.isTableSelected() && !!this.ddb.rows && (this.ddb.rows.length === 0);
  }

  /** Table selected? */
  isTableSelected(): boolean {
    return !!this.ddb.table;
  }

}
