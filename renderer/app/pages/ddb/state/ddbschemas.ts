import { Action } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

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
  isBoolean?: boolean;
  isDate?: boolean;
  isNumeric?: boolean;
  isString?: boolean;
}

@State<DDBSchemasStateModel>({
  name: 'ddbschemas',
  defaults: {}
}) export class DDBSchemasState {

  @Action(UpdateSchema)
  updateSchema({ patchState }: StateContext<DDBSchemasStateModel>,
               { payload }: UpdateSchema) {
    const { tableName, schema } = payload;
    patchState({ [tableName]: schema });
  }

}
