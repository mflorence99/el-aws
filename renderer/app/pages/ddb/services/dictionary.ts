import * as DDB from 'aws-sdk/clients/dynamodb';

import { DDBStateModel } from '../state/ddb';
import { Injectable } from '@angular/core';
import { Schema } from '../state/ddbschemas';
import { Scheme } from '../state/ddbschemas';
import { View } from '../state/ddbviews';

/**
 * Dictionary service
 */

@Injectable()
export class DictionaryService {

  /** Get the schema columns in alpha order, but those definewd in table first */
  columns(ddb: DDBStateModel,
          ddbschema: Schema,
          onlyFilterable = false): string[] {
    const attrs = ddb.table.AttributeDefinitions
      .map(def => def.AttributeName);
    const columns = Object.keys(ddbschema)
      .filter(column => !attrs.includes(column))
      .sort((a, b) => {
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });
    return onlyFilterable? columns: attrs.concat(columns);
  }

  /** Make an unique row ID */
  makeRowID(ddb: DDBStateModel,
            row: any): string {
    return ddb.table.KeySchema.reduce((acc, element: DDB.KeySchemaElement) => {
      return `${acc}-${row[element.AttributeName]}`;
    }, '');
  }

  /** Return the rows for a particular view */
  rowsForView(rows: any[],
              schemes: Scheme[],
              ddbview: View): any[] {
    return (ddbview.sortColumn && rows)? this.sort(rows, schemes, ddbview) : rows;
  }

  /** Return the schema for a particular view */
  schemaForView(ddb: DDBStateModel,
                ddbschema: Schema,
                ddbview: View): Scheme[] {
    return this.columns(ddb, ddbschema)
      .filter(column => ddbview.visibility && ddbview.visibility[column])
      .reduce((acc, column) => {
        acc.push({ ...ddbschema[column] });
        return acc;
      }, []);
  }

  // private methods

  private sort(rows: any[],
               schemes: Scheme[],
               ddbview: View): any[] {
    const scheme = schemes.find(scheme => scheme.column === ddbview.sortColumn);
    const col = ddbview.sortColumn;
    const dir = ddbview.sortDir || 1;
    return rows.sort((a, b) => {
      if ((a[col] == null) && (b[col] == null))
        return 0;
      else if (a[col] == null)
        return -1 * dir;
      else if (b[col] == null)
        return +1 * dir;
      // @see https://stackoverflow.com/questions/17387435/
      //        javascript-sort-array-of-objects-by-a-boolean-property
      else if (scheme.type === 'boolean')
        return (<any>Boolean(b[col]) - <any>Boolean(a[col])) * dir;
      else if (scheme.type === 'number')
        return (Number(a[col]) - Number(b[col])) * dir;
      else if (scheme.type === 'string')
        return String(a[col]).toLowerCase().localeCompare(String(b[col]).toLowerCase()) * dir;
      else return 0;
    });
  }

}
