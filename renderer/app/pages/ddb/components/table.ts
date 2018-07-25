import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { DDBStateModel } from '../state/ddb';
import { DictionaryService } from '../services/dictionary';
import { EventEmitter } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { Output } from '@angular/core';
import { PaneComponent } from './pane';
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

  @Output() newTable = new EventEmitter<void>();

  hoverColumn: string;

  schemes: Scheme[] = [];

  private newStateImpl: Function;

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
              private dictSvc: DictionaryService,
              public pane: PaneComponent) {
    super();
    this.newStateImpl = debounce(this._newStateImpl, config.ddb.tableRefreshThrottle);
  }

  // event handlers

  onColumnHover(column: string) {
    this.hoverColumn = column;
    this.cdf.detectChanges();
  }

  // bind OnChange handlers

  @OnChange('ddb', 'ddbschema', 'ddbview') newState(): void {
    if (this.ddb && this.ddb.table && this.ddbschema && this.ddbview)
      this.newStateImpl();
  }

  // private methods

  private _newStateImpl(): void {
    this.schemes = this.dictSvc.schemaForView(this.ddb, this.ddbschema, this.ddbview);
    this.ddb.rows = this.dictSvc.rowsForView(this.ddb.rows, this.schemes, this.ddbview);
    this.newTable.emit();
  }

}
