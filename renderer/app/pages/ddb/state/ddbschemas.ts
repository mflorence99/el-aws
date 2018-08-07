import * as DDB from 'aws-sdk/clients/dynamodb';

import { Action } from '@ngxs/store';
import { InitView } from './ddbviews';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class InitSchema {
  static readonly type = '[DDBSchemas] init schema';
  constructor(public readonly payload: { tableName: string, rows: any[], attrs: DDB.AttributeDefinitions }) { }
}

export class UpdateSchema {
  static readonly type = '[DDBSchemas] update schema';
  constructor(public readonly payload: { tableName: string, schema: Schema }) { }
}

export interface DDBSchemasStateModel {
  [tableName: string]: Schema;
}

export interface Schema {
  [column: string]: Scheme;
}

export interface Scheme {
  column: string;
  showAs: 'currency' | 'date' | 'nowrap' | 'url' | null;
  tag: string;
  type: 'boolean' | 'number' | 'string' | any;
}

@State<DDBSchemasStateModel>({
  name: 'ddbschemas',
  defaults: { }
}) export class DDBSchemasState {

  @Action(InitSchema)
  initSchema({ dispatch, getState, patchState }: StateContext<DDBSchemasStateModel>,
             { payload }: InitSchema) {
    const { tableName, rows, attrs } = payload;
    // build up the schema from the actual data
    const schema = rows.reduce((acc, row) => {
      // NOTE: we complete the scheme for columns we haven't seen before
      Object.keys(row)
        .filter(column => !acc[column])
        .forEach(column => {
          const scheme: Scheme = {
            column: column,
            showAs: null,
            tag: column,
            type: typeof row[column]
          };
          acc[column] = scheme;
        });
      return acc;
    }, getState()[tableName] || { });
    // augment the schema with core attr defs
    attrs.forEach(attr => {
      if (!schema[attr.AttributeName]) {
        let type = 'string';
        if (attr.AttributeType === 'B')
          type = 'boolean';
        else if (attr.AttributeType === 'N')
          type = 'number';
        schema[attr.AttributeName] = {
          showAs: null,
          tag: attr.AttributeName,
          type: type
        };
      }
    });
    patchState({ [tableName]: schema });
    // initialize the view from the schema so far
    dispatch(new InitView( { tableName, schema }));
  }

  @Action(UpdateSchema)
  updateSchema({ patchState }: StateContext<DDBSchemasStateModel>,
               { payload }: UpdateSchema) {
    const { tableName, schema } = payload;
    patchState({ [tableName]: schema });
  }

}
