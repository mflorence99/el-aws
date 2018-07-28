import { Action } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class InitFilter {
  static readonly type = '[DDBFilters] init filter';
  constructor(public readonly payload: { tableName: string }) { }
}

export class UpdateFilter {
  static readonly type = '[DDBFilters] update filter';
  constructor(public readonly payload: { tableName: string, filter: Filter }) { }
}

export interface DDBFiltersStateModel {
  [tableName: string]: Filter;
}

export interface Filter {
  [column: string]: FilterExpression;
}

export interface FilterExpression {
  column: string;
  comparand: string;
}

export type FilterExpressionFormGroup = {
  [P in keyof FilterExpression]: any;
};

@State<DDBFiltersStateModel>({
  name: 'ddbfilters',
  defaults: { }
}) export class DDBFiltersState {

  @Action(InitFilter)
  initFilter({ getState, patchState }: StateContext<DDBFiltersStateModel>,
             { payload }: InitFilter) {
    const { tableName } = payload;
    const state = getState();
    if (!state[tableName])
      patchState({ [tableName]: { } });
  }

  @Action(UpdateFilter)
  updateFilter({ patchState }: StateContext<DDBFiltersStateModel>,
               { payload }: UpdateFilter) {
    const { tableName, filter } = payload;
    patchState({ [tableName]: filter});
  }

}
