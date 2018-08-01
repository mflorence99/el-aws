import { Action } from '@ngxs/store';
import { Schema } from './ddbschemas';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

import { isObjectEqual } from 'ellib'; 

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
  sortColumn?: string;
  sortDir?: number;
  submitted?: boolean;
  visibility?: ViewVisibility;
}

export interface ViewVisibility {
  [column: string]: boolean;
}

@State<DDBViewsStateModel>({
  name: 'ddbviews',
  defaults: { }
}) export class DDBViewsState {

  @Action(InitView)
  initView({ getState, patchState }: StateContext<DDBViewsStateModel>,
           { payload }: InitView) {
    const { tableName, schema } = payload;
    let view = getState()[tableName];
    if (!view) {
      view = {
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
    // NOTE: if the visibility flags haven't changed, then we don't need
    // to zero out the widths
    const updated = isObjectEqual(visibility, view.visibility) ?
      { ...view, visibility } : { ...view, visibility, widths: { } };
    patchState({ [tableName]: updated });
  }

}
