import { AppState } from '../../../state/app';
import { DDBState } from './ddb';
import { DDBStateModel } from './ddb';

// tslint:disable-next-line:no-empty-interface
export interface FeatureState extends AppState { 
  ddb: DDBStateModel;
}

export const states = [
  DDBState
];
