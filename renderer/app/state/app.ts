import { PrefsState } from './prefs';
import { PrefsStateModel } from './prefs';
import { StatusState } from './status';
import { StatusStateModel } from './status';
import { WindowState } from './window';
import { WindowStateModel } from './window';

export interface AppState {
  prefs: PrefsStateModel;
  status: StatusStateModel;
  window: WindowStateModel;
}

export const states = [ 
  PrefsState,
  StatusState,
  WindowState
];
