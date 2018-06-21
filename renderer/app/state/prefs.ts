import { Action } from '@ngxs/store';
import { Reload } from './window';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class UpdatePrefs {
  static readonly type = '[Prefs] update prefs';
  constructor(public readonly prefs: PrefsStateModel) { }
}

export type DateFmt = 'ago' | 'shortDate' | 'mediumDate' | 'longDate' | 'fullDate';
export type QuantityFmt = 'abbrev' | 'bytes' | 'number';
export type SortOrder = 'alpha' | 'first' | 'last';
export type TimeFmt = 'none' | 'shortTime' | 'mediumTime' | 'longTime' | 'fullTime';

export interface PrefsStateModel {
  configured?: boolean;
  dateFormat?: DateFmt;
  endpoints?: {
    ddb: string;
    s3: string;
  };
  quantityFormat?: QuantityFmt;
  showGridLines?: boolean;
  sortDirectories?: SortOrder;
  submitted?: boolean;
  timeFormat?: TimeFmt;
}

@State<PrefsStateModel>({
  name: 'prefs',
  defaults: {
    configured: false,
    dateFormat: 'mediumDate',
    endpoints: {
      ddb: '',
      s3: ''
    },
    quantityFormat: 'bytes',
    showGridLines: true,
    sortDirectories: 'first',
    timeFormat: 'none'
  }
}) export class PrefsState {

  @Action(UpdatePrefs)
  updatePrefs({ dispatch, getState, patchState }: StateContext<PrefsStateModel>,
              { prefs }: UpdatePrefs) {
    const state = getState();
    patchState({ ...prefs });
    // NOTE: new endpoints and we start over
    let startOver = false;
    if (!startOver && prefs.endpoints) {
      startOver = Object.keys(prefs.endpoints).reduce((acc, key) => {
        return acc || (prefs.endpoints[key] !== state.endpoints[key]);
      }, false);
    }   
    if (startOver)
      dispatch(new Reload()); 
  }

}
