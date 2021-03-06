import { Action } from '@ngxs/store';
import { Schema } from './ddbschemas';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class InitView {
  static readonly type = '[DDBViews] init view';
  constructor(public readonly payload: { tableName: string, schema: Schema }) { }
}

export class UpdateSort {
  static readonly type = '[DDBViews] update sort';
  constructor(public readonly payload: { tableName: string, sortColumn: string, sortDir: number }) { }
}

export class UpdateView {
  static readonly type = '[DDBViews] update view';
  constructor(public readonly payload: { tableName: string, view: View }) { }
}

export class UpdateVisibility {
  static readonly type = '[DDBViews] update visibility';
  constructor(public readonly payload: { tableName: string, visibility: ViewVisibility }) { }
}

export interface DDBViewsStateModel {
  [tableName: string]: View;
}

export interface View {
  sortColumn: string;
  sortDir: number;
  visibility: ViewVisibility;
}

export interface ViewVisibility {
  [column: string]: boolean;
}

@State<DDBViewsStateModel>({
  name: 'ddbviews',
  defaults: { }
}) export class DDBViewsState {

  /** Default state */
  static emptyView(): View {
    return { sortColumn: null, sortDir: 1, visibility: { } };
  }

  @Action(InitView)
  initView({ getState, patchState }: StateContext<DDBViewsStateModel>,
           { payload }: InitView) {
    const { tableName, schema } = payload;
    let view = getState()[tableName];
    if (!view) {
      view = {
        sortColumn: null,
        sortDir: 1,
        visibility: Object.keys(schema).reduce((acc, column) => {
          acc[column] = true;
          return acc;
        }, { })
      };
      patchState({ [tableName]: view });
    }
  }

  @Action(UpdateSort)
  updateSort({ getState, patchState }: StateContext<DDBViewsStateModel>,
             { payload }: UpdateSort) {
    const { tableName, sortColumn, sortDir } = payload;
    const view = getState()[tableName];
    patchState({ [tableName]: { ...view, sortColumn, sortDir } });
  }

  @Action(UpdateView)
  updateView({ patchState }: StateContext<DDBViewsStateModel>,
             { payload }: UpdateView) {
    const { tableName, view } = payload;
    patchState({ [tableName]: view });
  }

  @Action(UpdateVisibility)
  updateVisibility({ getState, patchState }: StateContext<DDBViewsStateModel>,
                   { payload }: UpdateVisibility) {
    const { tableName, visibility } = payload;
    const view = getState()[tableName];
    const updated = { ...view, visibility };
    patchState({ [tableName]: updated });
  }

}
