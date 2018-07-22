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
          ddbschema: Schema): string[] {
    const attrs = ddb.table.AttributeDefinitions.map(def => def.AttributeName);
    const columns = Object.keys(ddbschema)
      .filter(column => !attrs.includes(column))
      .sort((a, b) => {
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });
    return attrs.concat(columns);
  }

  /** Return the rows for a particular view */
  rowsForView(rows: any[],
              schemes: Scheme[],
              ddbview: View): any[] {
    return ddbview.sortColumn? this.sort(rows, schemes, ddbview) : rows;
  }

  /** Return the schema for a particular view */
  schemaForView(ddb: DDBStateModel,
                ddbschema: Schema,
                ddbview: View): Scheme[] {
    return this.columns(ddb, ddbschema)
      .filter(column => ddbview.visibility && ddbview.visibility[column])
      .reduce((acc, column) => {
        // NOTE: as we separate the schemes from the schema, add in the column
        acc.push({ column, ...ddbschema[column] });
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
        return (b[col] - a[col]) * dir;
      else if (scheme.type === 'number')
        return (a[col] - b[col]) * dir;
      else if (scheme.type === 'string')
        return a[col].toLowerCase().localeCompare(b[col].toLowerCase()) * dir;
      else return 0;
    });
  }

}
