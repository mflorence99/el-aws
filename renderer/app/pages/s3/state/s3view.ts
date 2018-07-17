import { Action } from '@ngxs/store';
import { Selector } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';
import { WatcherService } from '../services/watcher';

import { config } from '../../../config';
import { isObjectEqual } from 'ellib'; 

/** NOTE: actions must come first because of AST */

export class AddPath {
  static readonly type = '[S3View] add path';
  constructor(public readonly payload: { path: string }) { }
}

export class ClearPaths {
  static readonly type = '[S3View] clear paths';
  constructor(public readonly payload?: any) { }
}

export class ExpirePaths {
  static readonly type = '[S3View] expire paths';
  constructor(public readonly payload?: any) { }
}

export class RemovePath {
  static readonly type = '[S3View] remove path';
  constructor(public readonly payload: { path: string }) { }
}

export class RemovePaths {
  static readonly type = '[S3View] remove paths';
  constructor(public readonly payload: { paths: string[] }) { }
}

export class UpdatePathLRU {
  static readonly type = '[S3View] update path LRU';
  constructor(public readonly payload: { path: string }) { }
}

export class UpdateSort {
  static readonly type = '[S3View] update sort';
  constructor(public readonly payload: { sortColumn: string, sortDir: number }) { }
}

export class UpdateVisibility {
  static readonly type = '[S3View] update visibility';
  constructor(public readonly payload: { visibility: ViewVisibility }) { }
}

export class UpdateWidths {
  static readonly type = '[S3View] update widths';
  constructor(public readonly payload: { widths: ViewWidths }) { }
}

export interface LRUCache {
  [path: string]: number;
}

export interface S3ViewStateModel {
  lru?: LRUCache;
  paths?: string[];
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

@State<S3ViewStateModel>({
  name: 's3view',
  defaults: {
    lru: { },
    paths: ['/'],
    sortColumn: 'name',
    sortDir: 1,
    widths: {
      name: 60,
      size: 20,
      timestamp: 20
    },
    visibility: {
      name: true,
      size: true,
      timestamp: true
    }
  }
}) export class S3ViewState {

  @Selector() static getPaths(state: S3ViewStateModel): string[] {
    return state.paths;
  }

  /** ctor */
  constructor(private watcher: WatcherService) { }

  @Action(AddPath)
  addPath({ getState, patchState }: StateContext<S3ViewStateModel>,
          { payload }: AddPath) {
    const { path } = payload;
    const state = getState();
    if (!state.paths.includes(path)) { 
      patchState({ paths: [...state.paths, path] });
      // watch for changes
      this.watcher.watch(path);
    }
  }

  @Action(ClearPaths)
  clearPaths({ getState, patchState }: StateContext<S3ViewStateModel>,
             { payload }: ClearPaths) {
    const state = getState();
    // stop watching for changes
    state.paths.forEach(path => this.watcher.unwatch(path));
    // clear state
    patchState({ paths: [config.s3.delimiter] });
    patchState({ lru: { } });
    // watch for changes
    this.watcher.watch(config.s3.delimiter);
  }

  @Action(ExpirePaths)
  expirePaths({ dispatch, getState }: StateContext<S3ViewStateModel>,
              { payload }: ExpirePaths) {
    const state = getState();
    const paths = [...Object.keys(state.lru)];
    const now = Date.now();
    const expired = paths.filter(path => {
      const ts = state.lru[path];
      return (ts < (now - config.s3.pathPurgeAge));
    });
    dispatch(new RemovePaths({ paths: expired }));
  }

  @Action(RemovePath)
  removePath({ dispatch }: StateContext<S3ViewStateModel>,
             { payload }: RemovePath) {
    const { path } = payload;
    dispatch(new RemovePaths({ paths: [path] }));
  }

  @Action(RemovePaths)
  removePaths({ getState, patchState }: StateContext<S3ViewStateModel>,
              { payload }: RemovePaths) {
    const { paths } = payload;
    const state = getState();
    paths.forEach(path => {
      const ix = state.paths.indexOf(path);
      if (ix !== -1) {
        const paths = state.paths.slice(0);
        paths.splice(ix, 1);
        patchState({ paths });
        const { [path]: gonzo, ...lru } = state.lru;
        patchState({ lru });
        // stop watching for changes
        this.watcher.unwatch(path);
      }
    });
  }

  @Action(UpdatePathLRU)
  updatePathLRU({ getState, patchState }: StateContext<S3ViewStateModel>,
                { payload }: UpdatePathLRU) {
    const { path } = payload;
    // NOTE: the root doesn't have an LRU
    if (path !== config.s3.delimiter) {
      const state = getState();
      patchState({ lru: { ...state.lru, [path]: Date.now() } });
    }
  }

  @Action(UpdateSort)
  updateSort({ patchState }: StateContext<S3ViewStateModel>,
             { payload }: UpdateSort) {
    const { sortColumn, sortDir } = payload;
    patchState({ sortColumn, sortDir });
  }

  @Action(UpdateVisibility)
  updateVisibility({ getState, patchState }: StateContext<S3ViewStateModel>,
                  { payload }: UpdateVisibility) {
    const { visibility } = payload;
    const state = getState();
    // NOTE: if the visibility flags haven't changed, then we don't need
    // to zero out the widths
    if (!isObjectEqual(visibility, state.visibility))
      patchState({ widths: { } });
    patchState({ visibility });
  }

  @Action(UpdateWidths)
  updateWidths({ patchState }: StateContext<S3ViewStateModel>,
               { payload }: UpdateWidths) {
    const { widths } = payload;
    patchState({ widths });
  }

}
