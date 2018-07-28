import * as DDB from 'aws-sdk/clients/dynamodb';

import { DynamoDB } from 'aws-sdk';
import { FeatureState } from '../state/feature';
import { Filter } from '../state/ddbfilters';
import { Injectable } from '@angular/core';
import { Message } from '../../../state/status';
import { Observable } from 'rxjs';
import { PrefsState } from '../../../state/prefs';
import { PrefsStateModel } from '../../../state/prefs';
import { Schema } from '../state/ddbschemas';
import { Select } from '@ngxs/store';
import { Store } from '@ngxs/store';
import { View } from '../state/ddbviews';

import { config } from '../../../config';
import { isObjectEmpty } from 'ellib';

/**
 * DynamoDB service
 * 
 * NOTE: we are using the browser API as it is so much faster. Under Node.js
 * RPC calls to object access are REALLY slow
 */

@Injectable()
export class DDBService {

  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;

  private ddb: DDB;

  /** ctor */
  constructor(private store: Store) {
    this.prefs$.subscribe((prefs: PrefsStateModel) => {
      this.ddb = new DynamoDB({
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
    // snapshot the view
    const ddbview: View = this.store.selectSnapshot((state: FeatureState) => state.ddbviews)[tableName] || { visibility: { } };
    const projectionExpression = Object.keys(ddbview.visibility)
      .filter(column => ddbview.visibility && ddbview.visibility[column])
      .reduce((acc, column) => {
        acc.push(this.safeAttributeName(column));
        return acc;
      }, []).join(', ');
    // snapshot the filter
    const ddbfilter: Filter = this.store.selectSnapshot((state: FeatureState) => state.ddbfilters)[tableName] || {};
    // snapshot the schema
    const ddbschema: Schema = this.store.selectSnapshot((state: FeatureState) => state.ddbschemas)[tableName] || { };
    const attributeNames = Object.keys(ddbschema)
      .filter(column => {
        return (ddbfilter[column] && ddbfilter[column].comparand) 
            || (ddbview.visibility && ddbview.visibility[column]);
      })
      .reduce((acc, column) => {
        acc[this.safeAttributeName(column)] = column;
        return acc;
      }, { });
    const attributeValues = Object.keys(ddbfilter)
      .filter(column => (ddbfilter[column] && ddbfilter[column].comparand))
      .reduce((acc, column) => {
        acc[this.safeAttributeValue(column)] = { 'S': ddbfilter[column].comparand };
        return acc;
      }, { });
    const filterExpression = Object.keys(ddbfilter)
      .filter(column => (ddbfilter[column] && ddbfilter[column].comparand))
      .map(column => `contains(${this.safeAttributeName(column)}, ${this.safeAttributeValue(column)})`); 
    // use state to build scan parameters
    const params = {
      ExclusiveStartKey: lastEvaluatedKey,
      ExpressionAttributeNames: isObjectEmpty(attributeNames)? null : attributeNames,
      ExpressionAttributeValues: isObjectEmpty(attributeValues)? null : attributeValues,
      FilterExpression: (filterExpression.length === 0) ? null : filterExpression.join(' and '),
      Limit: config.ddb.maxRowsPerPage,
      ProjectionExpression: projectionExpression || null,
      Select: projectionExpression ? 'SPECIFIC_ATTRIBUTES' : 'ALL_ATTRIBUTES',
      TableName: tableName
    };
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

  private safeAttributeName(column: string): string {
    return `#${column.toUpperCase()}`;
  }

  private safeAttributeValue(column: string): string {
    return `:val_${column.toLowerCase()}`;
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
