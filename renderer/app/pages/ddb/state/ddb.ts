import * as DDB from 'aws-sdk/clients/dynamodb';

import { Action } from '@ngxs/store';
import { DDBService } from '../services/ddb';
import { InitFilter } from './ddbfilters';
import { InitSchema } from './ddbschemas';
import { Message } from '../../../state/status';
import { NgZone } from '@angular/core';
import { Selector } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class LoadRows {
  static readonly type = '[DDB] load rows';
  constructor(public readonly payload?: any) { }
}

export class LoadTable {
  static readonly type = '[DDB] load table';
  constructor(public readonly payload: { tableName: string }) { }
}

export class ReloadTable {
  static readonly type = '[DDB] reload table';
  constructor(public readonly payload?: any) { }
}

export class RowsLoaded {
  static readonly type = '[DDB] rows loaded';
  constructor(public readonly payload: { tableName: string, rows: any[], lastEvaluatedKey: DDB.Key }) { }
}

export interface DDBStateModel {
  index: number;
  lastEvaluatedKey: DDB.Key;
  loading: boolean;
  rows: any[];
  table: DDB.TableDescription;
}

@State<DDBStateModel>({
  name: 'ddb',
  defaults: { 
    index: 0,
    lastEvaluatedKey: null,
    loading: false,
    rows: null,
    table: null
  }
}) export class DDBState {

  @Selector() static getIndex(state: DDBStateModel): number {
    return state.index;
  }

  @Selector() static getTable(state: DDBStateModel): DDB.TableDescription {
    return state.table;
  }

  /** ctor */
  constructor(private ddbSvc: DDBService,
              private zone: NgZone) { }

  @Action(LoadRows)
  loadRows({ dispatch, getState, patchState }: StateContext<DDBStateModel>,
           { payload }: LoadRows) {
    const state = getState();
    const tableName = state.table.TableName;
    dispatch(new Message({ text: `Loading ${tableName} rows ...` }));
    patchState({ loading: true });
    this.ddbSvc.scan(tableName,
                     state.lastEvaluatedKey,
                     (rows: any[], 
                      lastEvaluatedKey: DDB.Key) => {
      this.zone.run(() => {
        dispatch(new RowsLoaded({ tableName, rows, lastEvaluatedKey }));
      });
    });
  }

  @Action(LoadTable)
  loadTable({ dispatch, patchState }: StateContext<DDBStateModel>,
            { payload }: LoadTable) {
    const { tableName } = payload;
    if (tableName) {
      dispatch(new Message({ text: `Loading table ${tableName} ...` }));
      this.ddbSvc.describeTable(tableName, (table: DDB.TableDescription) => {
        patchState({ index: 0, lastEvaluatedKey: null, rows: null, table });
        this.zone.run(() => {
          dispatch(new LoadRows());
          // initialize the filter as we load new tables
          dispatch(new InitFilter({ tableName }));
        });
      });
    }
    else patchState({ index: 0, lastEvaluatedKey: null, rows: null, table: null });
  }

  @Action(ReloadTable)
  reloadTable({ dispatch, getState }: StateContext<DDBStateModel>,
              { payload }: ReloadTable) {
    const state = getState();
    if (state.table)
      dispatch(new LoadTable({ tableName: state.table.TableName }));
  }

  @Action(RowsLoaded)
  rowsLoaded({ dispatch, getState, patchState }: StateContext<DDBStateModel>,
             { payload }: RowsLoaded) {
    const { tableName, rows, lastEvaluatedKey } = payload;
    const state = getState();
    const index = state.lastEvaluatedKey? state.index + state.rows.length : 0;
    patchState({ index, lastEvaluatedKey, loading: false, rows });
    this.zone.run(() => {
      dispatch(new Message({ text: `Loaded ${tableName} rows ${index + 1} through ${index + rows.length}` }));
      // build up the schema as we see new data
      dispatch(new InitSchema({ tableName, rows, attrs: state.table.AttributeDefinitions }));
    });
  }

}
