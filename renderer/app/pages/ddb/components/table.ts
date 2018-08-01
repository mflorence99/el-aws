import { AddRowToSelection } from '../state/ddbselection';
import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { DDBSelectionStateModel } from '../state/ddbselection';
import { DDBStateModel } from '../state/ddb';
import { DictionaryService } from '../services/dictionary';
import { EventEmitter } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { Output } from '@angular/core';
import { PaneComponent } from './pane';
import { PrefsStateModel } from '../../../state/prefs';
import { ReplaceRowsInSelection } from '../state/ddbselection';
import { Schema } from '../state/ddbschemas';
import { Scheme } from '../state/ddbschemas';
import { Store } from '@ngxs/store';
import { ToggleRowInSelection } from '../state/ddbselection';
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
  @Input() ddbselection = { } as DDBSelectionStateModel;
  @Input() ddbview = { } as View;
  @Input() prefs = { } as PrefsStateModel;

  @Output() newTable = new EventEmitter<void>();

  hoverColumn: string;
  numScrollSteps = config.ddb.scrollAnimSteps;
  scrollDuration = config.ddb.scrollAnimDuration;

  schemes: Scheme[] = [];

  trackCols: Function;
  trackRows: Function;

  private newStateImpl: Function;

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
              private dictSvc: DictionaryService,
              public pane: PaneComponent, 
              private store: Store) {
    super();
    this.newStateImpl = debounce(this._newStateImpl, config.ddb.tableRefreshThrottle);
    this.trackCols = this.trackColsImpl.bind(this);
    this.trackRows = this.trackRowsImpl.bind(this);
  }

  // event handlers

  onColumnHover(column: string) {
    this.hoverColumn = column;
    this.cdf.detectChanges();
  }

  onSelect(event: MouseEvent,
           row: number): void {
    const actions = [];
    if (event.shiftKey) {
      if (this.ddbselection.rows.length === 0)
        actions.push(new AddRowToSelection({ row }));
      else {
        const alreadySelected = this.ddbselection.rows.sort();
        const newlySelected = [];
        while (row < alreadySelected[0])
          newlySelected.push(row++);
        while (row > alreadySelected[alreadySelected.length - 1])
          newlySelected.push(row--);
        const rows = alreadySelected.concat(newlySelected);
        actions.push(new ReplaceRowsInSelection({ rows }));
      }
    }
    else if (event.ctrlKey)
      actions.push(new ToggleRowInSelection({ row }));
    else actions.push(new ReplaceRowsInSelection({ rows: [row] }));
    if (actions.length > 0)
      this.store.dispatch(actions);
  }

  // bind OnChange handlers

  @OnChange('ddb', 'ddbschema', 'ddbview') newState(_ddb, _ddbschema, _ddbview): void {
    if (this.ddb && this.ddb.table && this.ddbschema && this.ddbview)
      this.newStateImpl();
  }

  // private methods

  private _newStateImpl(): void {
    this.schemes = this.dictSvc.schemaForView(this.ddb, this.ddbschema, this.ddbview);
    this.ddb.rows = this.dictSvc.rowsForView(this.ddb.rows, this.schemes, this.ddbview);
    this.cdf.detectChanges();
    this.newTable.emit();
  }

  private trackColsImpl(index: number,
                        scheme: Scheme): string {
    return scheme.column;
  }

  private trackRowsImpl(index: number,
                        row: any): any {
    return this.dictSvc.makeRowID(this.ddb, row);
  }

}
