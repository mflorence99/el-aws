import { Action } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

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
