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
import { UUID } from 'angular2-uuid';

import { config } from '../../../config';

/** NOTE: actions must come first because of AST */

export class ExtendRows {
  static readonly type = '[DDB] extend rows';
  constructor(public readonly payload: { extensionNum: number }) { }
}

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
  constructor(public readonly payload: { tableName: string, rows: any[], lastEvaluatedKey: DDB.Key, extensionNum?: number }) { }
}

export interface DDBStateModel {
  index: number;
  lastEvaluatedKey: DDB.Key;
  loading: boolean;
  reservoir: any[];
  rows: any[];
  sanityCheck: string;
  table: DDB.TableDescription;
}

@State<DDBStateModel>({
  name: 'ddb',
  defaults: DDBState.defaultState()
}) export class DDBState {

  /** Default state */
  static defaultState(): DDBStateModel {
    return {
      index: 0,
      lastEvaluatedKey: null,
      loading: false,
      reservoir: null,
      rows: null,
      sanityCheck: null,
      table: null
    };
  }

  @Selector() static getIndex(state: DDBStateModel): number {
    return state.index;
  }

  @Selector() static getTable(state: DDBStateModel): DDB.TableDescription {
    return state.table;
  }

  /** ctor */
  constructor(private ddbSvc: DDBService,
              private zone: NgZone) { }

  @Action(ExtendRows)
  extendRows({ dispatch, getState, patchState }: StateContext<DDBStateModel>,
             { payload }: ExtendRows) {
    const { extensionNum } = payload;
    let state = getState();
    const tableName = state.table.TableName;
    const sanityCheck = UUID.UUID();
    patchState({ sanityCheck });
    this.ddbSvc.scan(tableName,
                     state.reservoir,
                     state.lastEvaluatedKey,
                     (rows: any[],
                      lastEvaluatedKey: DDB.Key) => {
        // NOTE the sanity check -- we want to make sure than another pre-emptive
        // LoadRows action hasn't reset our state -- if it has, we just
        // ignore the results of this ExtendRows
        state = getState();
        if (sanityCheck === state.sanityCheck) {
          this.zone.run(() => {
            const needed = config.ddb.maxRowsPerPage - state.rows.length;
            patchState({ reservoir: rows.slice(needed) });
            rows = state.rows.concat(rows.slice(0, needed));
            dispatch(new RowsLoaded({ tableName, rows, lastEvaluatedKey, extensionNum }));
            if (lastEvaluatedKey && (rows.length < config.ddb.maxRowsPerPage))
              dispatch(new ExtendRows({ extensionNum: extensionNum + 1 }));
          });
        }
      });
  }

  @Action(LoadRows)
  loadRows({ dispatch, getState, patchState }: StateContext<DDBStateModel>,
           { payload }: LoadRows) {
    const state = getState();
    const tableName = state.table.TableName;
    dispatch(new Message({ text: `Loading ${tableName} rows ...` }));
    patchState({ loading: true, sanityCheck: null });
    this.ddbSvc.scan(tableName,
                     state.reservoir,
                     state.lastEvaluatedKey,
                     (rows: any[], 
                      lastEvaluatedKey: DDB.Key) => {
      this.zone.run(() => {
        const needed = config.ddb.maxRowsPerPage;
        patchState({ reservoir: rows.slice(needed) });
        rows = rows.slice(0, needed);
        dispatch(new RowsLoaded({ tableName, rows, lastEvaluatedKey }));
        if (lastEvaluatedKey && (rows.length < config.ddb.maxRowsPerPage))
          dispatch(new ExtendRows({ extensionNum: 1 }));
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
        patchState({ ...DDBState.defaultState(), table });
        this.zone.run(() => {
          dispatch(new LoadRows());
          // initialize the filter as we load new tables
          dispatch(new InitFilter({ tableName }));
        });
      });
    }
    else patchState(DDBState.defaultState());
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
    const { tableName, rows, lastEvaluatedKey, extensionNum } = payload;
    const state = getState();
    const index = (state.lastEvaluatedKey && !extensionNum)? 
      state.index + state.rows.length : state.index;
    // NOTE: it is possible that DDB tells us via lastEvaluatedKey that there
    // are more rows but in fact there are not -- so we must take care
    // not to zero out the rows we are currently showing
    if ((rows.length === 0) && !lastEvaluatedKey && state.lastEvaluatedKey)
      patchState({ lastEvaluatedKey: null, loading: false });
    else patchState({ index, lastEvaluatedKey, loading: false, rows });
    this.zone.run(() => {
      dispatch(new Message({ text: `Loaded ${tableName} rows ${index + 1} through ${index + rows.length}` }));
      // build up the schema as we see new data
      dispatch(new InitSchema({ tableName, rows, attrs: state.table.AttributeDefinitions }));
    });
  }

}
