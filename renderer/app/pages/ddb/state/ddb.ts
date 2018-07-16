import * as DDB from 'aws-sdk/clients/dynamodb';

import { Action } from '@ngxs/store';
import { DDBService } from '../services/ddb';
import { Message } from '../../../state/status';
import { NgZone } from '@angular/core';
import { Selector } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class LoadTable {
  static readonly type = '[DDB] load table';
  constructor(public readonly payload: { tableName: string }) { }
}

export interface DDBStateModel {
  table: DDB.TableDescription;
}

@State<DDBStateModel>({
  name: 'ddb',
  defaults: { 
    table: null
  }
}) export class DDBState {

  @Selector() static getTable(state: DDBStateModel): DDB.TableDescription {
    return state.table;
  }

  /** ctor */
  constructor(private ddbSvc: DDBService,
              private zone: NgZone) { }

  @Action(LoadTable)
  loadTable({ dispatch, patchState }: StateContext<DDBStateModel>,
            { payload }: LoadTable) {
    const { tableName } = payload;
    if (tableName) {
      dispatch(new Message({ text: `Loading table ${tableName} ...` }));
      this.ddbSvc.describeTable(tableName, (table: DDB.TableDescription) => {
        patchState({ table });
        this.zone.run(() => {
          dispatch(new Message({ text: `Table ${tableName} loaded` }));
        });
      });
    }
    else patchState({ table: null });
  }

}
