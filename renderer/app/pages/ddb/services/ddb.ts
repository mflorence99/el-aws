import * as DDB from 'aws-sdk/clients/dynamodb';
import * as Faker from 'faker';

import { DDBSelectionStateModel } from '../state/ddbselection';
import { DDBStateModel } from '../state/ddb';
import { DynamoDB } from 'aws-sdk';
import { ElectronService } from 'ngx-electron';
import { FeatureState } from '../state/feature';
import { Filter } from '../state/ddbfilters';
import { Injectable } from '@angular/core';
import { Message } from '../../../state/status';
import { Observable } from 'rxjs';
import { PeriodResolverService } from '../../../services/period-resolver';
import { PrefsState } from '../../../state/prefs';
import { PrefsStateModel } from '../../../state/prefs';
import { Schema } from '../state/ddbschemas';
import { Select } from '@ngxs/store';
import { Store } from '@ngxs/store';
import { View } from '../state/ddbviews';

import { config } from '../../../config';
import { isObjectEmpty } from 'ellib';

import async from 'async-es';

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
  private faker: typeof Faker;

  /** ctor */
  constructor(private electron: ElectronService,
              private periodResolver: PeriodResolverService,
              private store: Store) {
    this.faker = this.electron.remote.require('faker');
    this.prefs$.subscribe((prefs: PrefsStateModel) => {
      this.ddb = new DynamoDB({
        endpoint: prefs.endpoints.ddb,
        maxRetries: config.ddb.maxRetries,
        region: prefs.region
      });
    });
  }

  /** Delete selected items */
  deleteSelected(tableName: string,
                 cb: Function): void {
    // take a state snapshot
    const ddb: DDBStateModel = this.store.selectSnapshot((state: FeatureState) => state.ddb);
    const ddbschema: Schema = this.store.selectSnapshot((state: FeatureState) => state.ddbschemas)[tableName] || {};
    const ddbselection: DDBSelectionStateModel = this.store.selectSnapshot((state: FeatureState) => state.ddbselection);
    // build a list of delete functions
    const funcs = async.reflectAll(ddbselection.rows.map(index => {
      const params = {
        Key: this.makeKey(ddb.rows[index], ddb.table.KeySchema, ddbschema),
        TableName: tableName
      };
      return async.apply(this.deleteItem.bind(this), params);
    }));
    // now delete them, one at a time
    async.series(funcs, (err, data) => cb());
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

  /** Populate test table */
  async populate() {
    for (let ix = 0; ix < 1000; ix++) {
      const values: DDB.ExpressionAttributeValueMap = {
        'account': { S: this.faker.finance.account() },
        'age': { N: String(this.faker.random.number({ min: 21, max: 65 })) },
        'avatar': { S: this.faker.internet.avatar() },
        'balance': { N: this.faker.finance.amount() },
        'city': { S: this.faker.address.city() },
        'companyName': { S: this.faker.company.companyName() },
        'dateOfHire': { N: String(this.faker.date.recent().getTime()) },
        'email': { S: this.faker.internet.email() },
        'firstName': { S: this.faker.name.firstName() },
        'jobTitle': { S: this.faker.name.jobTitle() },
        'lastName': { S: this.faker.name.lastName() },
        'notes': { S: this.faker.lorem.sentence() },
        'password': { S: this.faker.internet.password() },
        'permanent': { BOOL: this.faker.random.boolean() },
        'phoneNumber': { S: this.faker.phone.phoneNumber() },
        'state': { S: this.faker.address.state() },
        'url': { S: this.faker.internet.url() },
        'userName': { S: this.faker.internet.userName() },
        'zipCode': { S: this.faker.address.zipCode() }
      };
      const nms = Object.keys(values);
      const params: DDB.UpdateItemInput = {
        ExpressionAttributeNames: nms.reduce((acc, nm) => {
          acc[`#${nm}`] = nm;
          return acc;
        }, { } as DDB.ExpressionAttributeNameMap),
        ExpressionAttributeValues: nms.reduce((acc, nm) => {
          acc[`:${nm}`] = values[nm];
          return acc;
        }, { } as DDB.ExpressionAttributeValueMap),
        Key: { 'id': { N: String(ix + 1) } },
        TableName: 'DDBTestTable',
        UpdateExpression: 'SET ' + nms.reduce((acc, nm) => {
          acc.push(`#${nm} = :${nm}`);
          return acc;
        }, []).join(', ')
      };
      await this.ddb.updateItem(params).promise();
    }
  }

  /** Read data from a table */
  scan(tableName: string,
       reservoir: any[],
       lastEvaluatedKey: DDB.Key,
       cb: (rows: any[],
            lastEvaluatedKey: DDB.Key) => void): void {
    // take a state snapshot
    const ddbfilter: Filter = this.store.selectSnapshot((state: FeatureState) => state.ddbfilters)[tableName] || { };
    const ddbschema: Schema = this.store.selectSnapshot((state: FeatureState) => state.ddbschemas)[tableName] || { };
    const ddbview: View = this.store.selectSnapshot((state: FeatureState) => state.ddbviews)[tableName] || { sortColumn: null, sortDir: 1, visibility: { } };
    // use state to build scan parameters
    const params = {
      ExclusiveStartKey: lastEvaluatedKey,
      ExpressionAttributeNames: this.makeExpressionAttributeNames(ddbfilter, ddbschema, ddbview),
      ExpressionAttributeValues: this.makeExpressionAttributeValues(ddbfilter, ddbschema),
      FilterExpression: this.makeFilterExpression(ddbfilter, ddbschema),
      Limit: config.ddb.maxRowsPerPage,
      ProjectionExpression: this.makeProjectionExpression(ddbview),
      TableName: tableName
    };
    // now read data
    this.ddb.scan(params, (err, data: DDB.ScanOutput) => {
      this.trace('scan', params, err, { data: 'suppressed' });
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else {
        const rows = this.makeRowsFromItems(data.Items);
        cb((reservoir || []).concat(rows), data.LastEvaluatedKey);
      }
    });
  }

  // private methods

  private deleteItem(params: any,
                     cb: (err, data) => void): void {
    this.ddb.deleteItem(params, (err, data) => {
      this.trace('deleteItem', params, err, data);
      cb(err, data);
    });
  }

  private makeExpressionAttributeNames(ddbfilter: Filter,
                                       ddbschema: Schema,
                                       ddbview: View): DDB.ExpressionAttributeNameMap {
    const attributeNames: DDB.ExpressionAttributeNameMap = Object.keys(ddbschema)
      .filter(column => {
        return (ddbfilter[column] && ddbfilter[column].comparand)
          || (ddbview.visibility && ddbview.visibility[column]);
      })
      .reduce((acc, column) => {
        acc[this.safeAttributeName(column)] = column;
        return acc;
      }, { });
    return isObjectEmpty(attributeNames) ? null : attributeNames;
  }

  private makeExpressionAttributeValues(ddbfilter: Filter,
                                        ddbschema: Schema): DDB.ExpressionAttributeValueMap {
    const attributeValues = Object.keys(ddbfilter)
      .filter(column => {
        return (ddbfilter[column] && ddbfilter[column].comparand);
      })
      .reduce((acc, column) => {
        const av = this.safeAttributeValue(column);
        let comparand = ddbfilter[column].comparand;
        let comparand2 = ddbfilter[column].comparand2;
        if (ddbschema[column].showAs === 'date') {
          const range = this.periodResolver.resolve(comparand);
          comparand = String(range.from.valueOf());
          comparand2 = String(range.to.valueOf());
        }
        switch (ddbschema[column].type) {
          case 'boolean':
            acc[':boolean_true'] = { 'BOOL': true };
            acc[':number_true'] = { 'N': '1' };
            acc[':string_true'] = { 'S': 'true' };
            break;
          case 'number':
            acc[`${av}_lo`] = { 'N': comparand };
            if (comparand2)
              acc[`${av}_hi`] = { 'N': comparand2 };
            break;
          case 'string':
            acc[av] = { 'S': comparand };
            break;
        }
        return acc;
      }, { });
    return isObjectEmpty(attributeValues) ? null : attributeValues;
  }

  private makeFilterExpression(ddbfilter: Filter,
                               ddbschema: Schema): string {
    const filterExpression = Object.keys(ddbfilter)
      .filter(column => {
        return (ddbfilter[column] && ddbfilter[column].comparand);
      })
      .map(column => {
        const an = this.safeAttributeName(column);
        const av = this.safeAttributeValue(column);
        const comparand = ddbfilter[column].comparand;
        const comparand2 = ddbfilter[column].comparand2;
        switch (ddbschema[column].type) {
          case 'boolean':
            const expr = `(${an} = :boolean_true or ${an} = :number_true or ${an} = :string_true)`;
            return (comparand === 'true')? expr : `not ${expr}`;
          case 'number':
            if (comparand2 || (ddbschema[column].showAs === 'date'))
              return `${an} between ${av}_lo and ${av}_hi`;
            else return `${an} >= ${av}_lo`;
          case 'string':
            return `contains(${an}, ${av})`;
        }
      }); 
    return (filterExpression.length === 0) ? null : filterExpression.join(' and ');
  }

  private makeKey(row: any,
                  keySchema: DDB.KeySchema,
                  ddbschema: Schema): DDB.Key {
    return keySchema.reduce((acc, element) => {
      const column = element.AttributeName;
      switch (ddbschema[column].type) {
        case 'boolean':
          acc[column] = { 'BOOL': Boolean(row[column]) };
          break;
        case 'number':
          acc[column] = { 'N': String(row[column]) };
          break;
        case 'string':
          acc[column] = { 'S': String(row[column]) };
          break;
      }
      return acc;
    }, { } as DDB.Key);
  }

  private makeProjectionExpression(ddbview: View): string {
    const projectionExpression = Object.keys(ddbview.visibility)
      .filter(column => ddbview.visibility && ddbview.visibility[column])
      .reduce((acc, column) => {
        acc.push(this.safeAttributeName(column));
        return acc;
      }, []).join(', ');
    return projectionExpression || null;
  }

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
