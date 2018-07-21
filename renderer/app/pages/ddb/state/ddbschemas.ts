import { Action } from '@ngxs/store';
import { InitView } from './ddbviews';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class InitSchema {
  static readonly type = '[DDBSchemas] init schema';
  constructor(public readonly payload: { tableName: string, rows: any[] }) { }
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

// TODO: provisional
export interface Scheme {
  showAs: 'currency' | 'date' | 'millis' | null;
  tag: string;
  type: 'boolean' | 'number' | 'string' | any;
}

export type SchemeFormGroup = {
  [P in keyof Scheme]: any;
};

@State<DDBSchemasStateModel>({
  name: 'ddbschemas',
  defaults: { }
}) export class DDBSchemasState {

  @Action(InitSchema)
  initSchema({ dispatch, getState, patchState }: StateContext<DDBSchemasStateModel>,
             { payload }: InitSchema) {
    const { tableName, rows } = payload;
    const schema = rows.reduce((acc, row) => {
      // NOTE: we complete the scheme for columns we haven't seen before
      Object.keys(row)
        .filter(column => !acc[column])
        .forEach(column => {
          const scheme: Scheme = {
            showAs: null,
            tag: column,
            type: typeof row[column]
          };
          acc[column] = scheme;
        });
      return acc;
    }, getState()[tableName] || { });
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
