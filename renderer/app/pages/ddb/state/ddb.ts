import * as DDB from 'aws-sdk/clients/dynamodb';

import { Action } from '@ngxs/store';
import { DDBService } from '../services/ddb';
import { InitSchema } from './ddbschemas';
import { Message } from '../../../state/status';
import { NgZone } from '@angular/core';
import { Selector } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

import { config } from '../../../config';

/** NOTE: actions must come first because of AST */

export class ExtendRows {
  static readonly type = '[DDB] extend rows';
  constructor(public readonly payload: { tableName: string, lastEvaluatedKey: DDB.Key, extensionNum: number }) { }
}

export class LoadRows {
  static readonly type = '[DDB] load rows';
  constructor(public readonly payload: { tableName: string }) { }
}

export class LoadTable {
  static readonly type = '[DDB] load table';
  constructor(public readonly payload: { tableName: string }) { }
}

export class RowsLoaded {
  static readonly type = '[DDB] rows loaded';
  constructor(public readonly payload: { tableName: string, rows: any[] }) { }
}

export interface DDBStateModel {
  rows: any[];
  table: DDB.TableDescription;
}

@State<DDBStateModel>({
  name: 'ddb',
  defaults: { 
    rows: null,
    table: null
  }
}) export class DDBState {

  @Selector() static getTable(state: DDBStateModel): DDB.TableDescription {
    return state.table;
  }

  /** ctor */
  constructor(private ddbSvc: DDBService,
              private zone: NgZone) { }

  @Action(ExtendRows)
  extendRows({ dispatch, getState }: StateContext<DDBStateModel>,
             { payload }: ExtendRows) {
    const { tableName, lastEvaluatedKey, extensionNum } = payload;
    this.ddbSvc.scan(tableName,
                     lastEvaluatedKey,
                     (rows: any[],
                      lastEvaluatedKey: DDB.Key) => {
      this.zone.run(() => {
        if (rows.length > 0) {
          rows = getState().rows.concat(rows);
          dispatch(new RowsLoaded({ tableName, rows }));
        }
        dispatch(new Message({ text: `Extended ${tableName} rows` }));
        // keep going if there's more
        if (lastEvaluatedKey && (rows.length < config.ddb.maxRows) && (extensionNum < config.ddb.maxRowExtensions))
          dispatch(new ExtendRows({ tableName, lastEvaluatedKey, extensionNum: extensionNum + 1 }));
      });
    });
  }

  @Action(LoadRows)
  loadRows({ dispatch }: StateContext<DDBStateModel>,
           { payload }: LoadRows) {
    const { tableName } = payload;
    dispatch(new Message({ text: `Loading ${tableName} rows ...` }));
    this.ddbSvc.scan(tableName,
                     null,
                     (rows: any[], 
                      lastEvaluatedKey: DDB.Key) => {
      this.zone.run(() => {
        dispatch(new RowsLoaded({ tableName, rows }));
        dispatch(new Message({ text: `Loaded ${tableName} rows` }));
        // keep going if there's more
        if (lastEvaluatedKey && (rows.length < config.ddb.maxRows))
          dispatch(new ExtendRows({ tableName, lastEvaluatedKey, extensionNum: 1 }));
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
        patchState({ table });
        this.zone.run(() => {
          dispatch(new LoadRows({ tableName }));
        });
      });
    }
    else patchState({ rows: null, table: null });
  }

  @Action(RowsLoaded)
  rowsLoaded({ dispatch, patchState }: StateContext<DDBStateModel>,
             { payload }: RowsLoaded) {
    const { tableName, rows } = payload;
    patchState({ rows });
    // build up the schema as we see new data
    dispatch(new InitSchema({ tableName, rows }));
  }

}
