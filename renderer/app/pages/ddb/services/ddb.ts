import * as DDB from 'aws-sdk/clients/dynamodb';

import { ElectronService } from 'ngx-electron';
import { Injectable } from '@angular/core';
import { Message } from '../../../state/status';
import { Observable } from 'rxjs';
import { PrefsState } from '../../../state/prefs';
import { PrefsStateModel } from '../../../state/prefs';
import { Select } from '@ngxs/store';
import { Store } from '@ngxs/store';

import { config } from '../../../config';

/**
 * DynamoDB service
 */

@Injectable()
export class DDBService {

  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;

  private ddb: DDB;

  private ddb_: typeof DDB;

  /** ctor */
  constructor(private electron: ElectronService,
              private store: Store) {
    this.ddb_ = this.electron.remote.require('aws-sdk/clients/dynamodb');
    this.prefs$.subscribe((prefs: PrefsStateModel) => {
      this.ddb = new this.ddb_({
        endpoint: prefs.endpoints.ddb
      });
    });
  }

  /** Describe a table */
  describeTable(tableName: string,
                cb: (table: DDB.TableDescription) => void): void {
    const params = {
      TableName: tableName
    };
    this.ddb.describeTable(params, (err, data) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else cb(data.Table);
    });
  }

  /** List all the tables */
  listTables(cb: (tableNames: DDB.TableNameList) => void): void {
    const params = {
      Limit: config.ddbMaxTables
    };
    this.ddb.listTables(params, (err, data) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else cb(data.TableNames);
    });
  }

}
