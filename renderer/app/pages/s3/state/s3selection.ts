import { Action } from '@ngxs/store';
import { Message } from '../../../state/status';
import { Selector } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

import { pluralize } from 'ellib';

/** NOTE: actions must come first because of AST */

export class AddPathToSelection {
  static readonly type = '[S3Selection] add path';
  constructor(public readonly payload: { path: string }) { }
}

export class ClearSelection {
  static readonly type = '[S3Selection] clear';
  constructor(public readonly payload?: any) { }
}

export class RemovePathFromSelection {
  static readonly type = '[S3Selection] remove path';
  constructor(public readonly payload: { path: string }) { }
}

export class ReplacePathsInSelection {
  static readonly type = '[S3Selection] replace paths';
  constructor(public readonly payload: { paths: string[] }) { }
}

export class SelectionUpdated {
  static readonly type = '[S3Selection] updated';
  constructor(public readonly payload: { paths: string[] }) { }
}

export class TogglePathInSelection {
  static readonly type = '[S3Selection] toggle path';
  constructor(public readonly payload: { path: string }) { }
}

export interface S3SelectionStateModel {
  paths: string[];
}

@State<S3SelectionStateModel>({
  name: 's3selection',
  defaults: {
    paths: []
  }
}) export class S3SelectionState {

  @Selector() static getPaths(state: S3SelectionStateModel): string[] {
    return state.paths;
  }

  @Action(AddPathToSelection)
  addPathToSelection({ dispatch, getState, patchState }: StateContext<S3SelectionStateModel>,
                     { payload }: AddPathToSelection) {
    const { path } = payload;
    const state = getState();
    if (!state.paths.includes(path)) {
      const paths = state.paths.slice(0);
      paths.push(path);
      patchState({ paths });
      dispatch(new SelectionUpdated({ paths }));
    }
  }

  @Action(ClearSelection)
  clearSelection({ dispatch, patchState }: StateContext<S3SelectionStateModel>,
                 { payload }: ClearSelection) {
    patchState({ paths: [] });
    dispatch(new SelectionUpdated({ paths: [] }));
  }

  @Action(RemovePathFromSelection)
  removePathFromSelection({ dispatch, getState, patchState }: StateContext<S3SelectionStateModel>,
                          { payload }: RemovePathFromSelection) {
    const { path } = payload;
    const state = getState();
    if (state.paths.includes(path)) {
      const paths = state.paths.slice(0);
      const ix = paths.indexOf(path);
      paths.splice(ix, 1);
      patchState({ paths });
      dispatch(new SelectionUpdated({ paths }));
    }
  }

  @Action(ReplacePathsInSelection)
  replacePathsInSelection({ dispatch, patchState }: StateContext<S3SelectionStateModel>,
                          { payload }: ReplacePathsInSelection) {
    const { paths } = payload;
    patchState({ paths });
    dispatch(new SelectionUpdated({ paths }));
  }

  @Action(SelectionUpdated)
  selectionUpdated({ dispatch }: StateContext<S3SelectionStateModel>,
                   { payload }: SelectionUpdated) {
    const { paths } = payload;
    let text = '';
    if (paths.length === 1)
      text = `${paths[0]} selected`;
    else if (paths.length > 1) {
      const others = pluralize(paths.length - 1, {
        '=1': 'one other', 'other': '# others'
      });
      text = `${paths[0]} and ${others} selected`;
    }
    dispatch(new Message({ text }));
  }

  @Action(TogglePathInSelection)
  togglePathInSelection({ dispatch, getState, patchState }: StateContext<S3SelectionStateModel>,
                        { payload }: TogglePathInSelection) {
    const { path } = payload;
    const state = getState();
    const paths = state.paths.slice(0);
    const ix = paths.indexOf(path);
    if (ix !== -1)
      paths.splice(ix, 1);
    else paths.push(path);
    patchState({ paths });
    dispatch(new SelectionUpdated({ paths }));
  }

}
