import { Action } from '@ngxs/store';
import { ElectronService } from 'ngx-electron';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

import { config } from '../config';

/** NOTE: actions must come first because of AST */

export class DevTools {
  static readonly type = '[Window] dev tools';
  constructor(public readonly payload?: any) { }
}

export class Reload {
  static readonly type = '[Window] reload';
  constructor(public readonly payload?: any) { }
}

export class Reset {
  static readonly type = '[Window] reset';
  constructor(public readonly payload?: any) { }
}

export class SetBounds {
  static readonly type = '[Window] set bounds';
  constructor(public readonly payload: { x, y, width, height }) { }
}

export class SetRoute {
  static readonly type = '[Window] set route';
  constructor(public readonly payload: string) { }
}

// NOTE: this is a bit of a hack because we're using ShowPagePrefs just
// as pub/sub -- it doesn't change the state -- but we need a way to 
// communicate with the (hidden) innards of a route

export class ShowPagePrefs {
  static readonly type = '[Window] show page prefs';
  constructor(public readonly payload?: any) { }
}

export interface WindowStateModel {
  bounds?: {x, y, width, height};
  route?: string;
}

@State<WindowStateModel>({
  name: 'window',
  defaults: { 
    route: '/setup'
  }
}) export class WindowState {

  /** ctor */
  constructor(private electron: ElectronService) { }

  @Action(DevTools)
  devtools() {
    const win = this.electron.remote.getCurrentWindow();
    win.webContents.openDevTools();
  }

  @Action(Reload)
  reload() {
    const win = this.electron.remote.getCurrentWindow();
    const url = win.webContents.getURL();
    // NOTE: we need this because the router messes with the URL
    // TODO: why doesn't everyone see this
    if (url.startsWith('http') || url.endsWith('index.html'))
      win.webContents.reload();
    else {
      const ix = url.lastIndexOf('/');
      win.webContents.loadURL(url.substring(0, ix + 1) + 'index.html');
    }
  }

  @Action(Reset)
  reset({ dispatch }: StateContext<WindowStateModel>,
        { payload }: Reset) {
    setTimeout(() => dispatch(new Reload()), config.resetDelay);
  }

  @Action(SetBounds)
  setBounds({ patchState }: StateContext<WindowStateModel>,
            { payload }: SetBounds) {
    patchState({ bounds: payload });
  }

  @Action(SetRoute)
  setRoute({ patchState }: StateContext<WindowStateModel>,
           { payload }: SetRoute) {
    patchState({ route: payload });
  }

}
