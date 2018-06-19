import { Action } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class UpdatePrefs {
  static readonly type = '[Prefs] update prefs';
  constructor(public readonly payload: PrefsStateModel) { }
}

export interface PrefsStateModel {
  submitted?: boolean;
}

@State<PrefsStateModel>({
  name: 'prefs',
  defaults: { }
}) export class PrefsState {

  @Action(UpdatePrefs)
  updatePrefs({ patchState }: StateContext<PrefsStateModel>,
              { payload }: UpdatePrefs) {
    patchState(payload);   
  }

}
