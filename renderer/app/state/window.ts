import { Action } from '@ngxs/store';
import { ElectronService } from 'ngx-electron';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class DevTools {
  static readonly type = '[Window] dev tools';
  constructor(public readonly payload?: any) { }
}

export class Reload {
  static readonly type = '[Window] reload';
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

export interface WindowStateModel {
  bounds?: {x, y, width, height};
  route?: string;
}

@State<WindowStateModel>({
  name: 'window',
  defaults: { }
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
    win.webContents.reload();
  }

  @Action(SetBounds)
  setBounds({ patchState }: StateContext<WindowStateModel>,
            { payload }: SetBounds) {
    patchState({ bounds: payload });
  }

  @Action(SetRoute)
  setTitle({ patchState }: StateContext<WindowStateModel>,
           { payload }: SetRoute) {
    patchState({ route: payload });
  }

}
