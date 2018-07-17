import { Action } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

import { isObjectEqual } from 'ellib'; 

/** NOTE: actions must come first because of AST */

export class UpdateSort {
  static readonly type = '[DDBViews] update sort';
  constructor(public readonly payload: { tableName: string, sortColumn: string, sortDir: number }) { }
}

export class UpdateVisibility {
  static readonly type = '[DDBViews] update visibility';
  constructor(public readonly payload: { tableName: string, visibility: ViewVisibility }) { }
}

export class UpdateWidths {
  static readonly type = '[DDBViews] update widths';
  constructor(public readonly payload: { tableName: string, widths: ViewWidths }) { }
}

export interface DDBViewsStateModel {
  [tableName: string]: View;
}

export interface View {
  sortColumn?: string;
  sortDir?: number;
  submitted?: boolean;
  visibility?: ViewVisibility;
  widths?: ViewWidths;
}

export interface ViewVisibility {
  [column: string]: boolean;
}

export interface ViewWidths {
  [column: string]: number;
}

@State<DDBViewsStateModel>({
  name: 'ddbviews',
  defaults: { }
}) export class DDBViewsState {

  @Action(UpdateSort)
  updateSort({ getState, patchState }: StateContext<DDBViewsStateModel>,
             { payload }: UpdateSort) {
    const { tableName, sortColumn, sortDir } = payload;
    const view = getState()[tableName];
    patchState({ [tableName]: { ...view, sortColumn, sortDir } });
  }

  @Action(UpdateVisibility)
  updateVisibility({ getState, patchState }: StateContext<DDBViewsStateModel>,
                   { payload }: UpdateVisibility) {
    const { tableName, visibility } = payload;
    const view = getState()[tableName];
    // NOTE: if the visibility flags haven't changed, then we don't need
    // to zero out the widths
    const updated = isObjectEqual(visibility, view.visibility) ?
      { ...view, visibility } : { ...view, visibility, widths: {} };
    patchState({ [tableName]: updated });
  }

  @Action(UpdateWidths)
  updateWidths({ getState, patchState }: StateContext<DDBViewsStateModel>,
               { payload }: UpdateWidths) {
    const { tableName, widths } = payload;
    const view = getState()[tableName];
    patchState({ [tableName]: { ...view, widths } });
  }

}
