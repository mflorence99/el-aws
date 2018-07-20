import * as DDB from 'aws-sdk/clients/dynamodb';

import { ElectronService } from 'ngx-electron';
import { FeatureState } from '../state/feature';
import { Filter } from '../state/ddbfilters';
import { Injectable } from '@angular/core';
import { Message } from '../../../state/status';
import { Observable } from 'rxjs';
import { PrefsState } from '../../../state/prefs';
import { PrefsStateModel } from '../../../state/prefs';
import { Select } from '@ngxs/store';
import { Store } from '@ngxs/store';
import { View } from '../state/ddbviews';

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
        endpoint: prefs.endpoints.ddb,
        maxRetries: config.ddb.maxRetries,
        region: prefs.region
      });
    });
  }

  /** Describe a table */
  describeTable(tableName: string,
                cb: (table: DDB.TableDescription) => void): void {
    const params = {
      TableName: tableName
    };
    this.ddb.describeTable(params, (err, data: DDB.DescribeTableOutput) => {
      this.trace('describeTable', params, err, data);
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else cb(data.Table);
    });
  }

  /** List all the tables */
  listTables(cb: (tableNames: DDB.TableNameList) => void): void {
    const params = {
      Limit: config.ddb.maxTables
    };
    this.ddb.listTables(params, (err, data: DDB.ListTablesOutput) => {
      this.trace('listTables', params, err, data);
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else cb(data.TableNames);
    });
  }

  /** Read data from a table */
  scan(tableName: string,
       lastEvaluatedKey: DDB.Key,
       cb: (rows: any[],
            lastEvaluatedKey: DDB.Key) => void): void {
    const params = {
      ExclusiveStartKey: lastEvaluatedKey,
      Limit: config.ddb.maxRowsPerScan,
      TableName: tableName
    };
    // TODO: use Filter and View for FilterExpression and ProjectionExpression
    const filter: Filter = this.store.selectSnapshot((state: FeatureState) => state.ddbfilters)[tableName];
    const view: View = this.store.selectSnapshot((state: FeatureState) => state.ddbviews)[tableName];
    console.log({ filter, view });
    // now read data
    this.ddb.scan(params, (err, data: DDB.ScanOutput) => {
      this.trace('scan', params, err, { data: 'suppressed' });
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else {
        const rows = this.makeRowsFromItems(data.Items);
        cb(rows, data.LastEvaluatedKey);
      }
    });
  }

  // private methods

  private makeRowsFromItems(Items: DDB.ItemList): any[] {
    return Items.map((Item: DDB.AttributeMap) => this.makeRowFromItem(Item));
  }

  private makeRowFromItem(Item: DDB.AttributeMap): any {
    return Object.keys(Item).reduce((acc, column) => {
      const value: DDB.AttributeValue = Item[column];
      // TODO: we are currently only handling scalar columns
      if (value.BOOL)
        acc[column] = !!value.BOOL;
      else if (value.N)
        acc[column] = Number(value.N);
      else if (value.NULL)
        acc[column] = null;
      else if (value.S)
        acc[column] = value.S;
      return acc;
    }, { });
  }

  private trace(op: string,
                params: any,
                err: any,
                data: any): void {
    console.group(`%cAWS DDB ${op} %c${JSON.stringify(params)}`, 'color: #e65100', 'color: gray');
    if (err)
      console.log(`%cERR %c${JSON.stringify(err)}`, 'color: #c53929', 'color: gray');
    if (data)
      console.log(`%cDATA %c${JSON.stringify(data)}`, 'color: #3367d6', 'color: gray');
    console.groupEnd();
  }

}
