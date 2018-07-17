import { Action } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

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

// TODO: placeholder
export type FilterExpression = any;

@State<DDBFiltersStateModel>({
  name: 'ddbfilters',
  defaults: {}
}) export class DDBFiltersState {

  @Action(UpdateFilter)
  updateFilter({ patchState }: StateContext<DDBFiltersStateModel>,
               { payload }: UpdateFilter) {
    const { tableName, filter } = payload;
    patchState({ [tableName]: filter});
  }

}
