import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBStateModel } from '../state/ddb';
import { DictionaryService } from '../services/dictionary';
import { ElementRef } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { PrefsStateModel } from '../../../state/prefs';
import { Schema } from '../state/ddbschemas';
import { Scheme } from '../state/ddbschemas';
import { View } from '../state/ddbviews';

import { config } from '../../../config';
import { debounce } from 'ellib';

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

  schemes: Scheme[] = [];

  private newStateImpl: Function;

  /** ctor */
  constructor(private dictSvc: DictionaryService,
              public element: ElementRef) {
    super();
    this.newStateImpl = debounce(this._newStateImpl, config.ddb.tableRefreshThrottle);
  }

  /** Loading rows completed?? */
  isDoneLoadingRows(): boolean {
    return this.isTableSelected() && !this.ddb.loading && !!this.ddb.rows;
  }

  /** Rows loading? */
  isLoadingRows(): boolean {
    return this.isTableSelected() && this.ddb.loading;
  }

  /** Empty table (or all data filtered out)? */
  isTableEmpty(): boolean {
    return this.isDoneLoadingRows() && (this.ddb.rows.length === 0);
  }

  /** Non-empty table? */
  isTablePopulated(): boolean {
    return this.isDoneLoadingRows() && (this.ddb.rows.length > 0);
  }

  /** Table selected? */
  isTableSelected(): boolean {
    return !!this.ddb.table;
  }

  // bind OnChange handlers

  @OnChange('ddb', 'ddbschema', 'ddbview') newState(): void {
    if (this.ddb && this.ddbschema && this.ddbview)
      this.newStateImpl();
  }

  // private methods

  private _newStateImpl(): void {
    this.schemes = this.dictSvc.schemaForView(this.ddb, this.ddbschema, this.ddbview);
  }

}
