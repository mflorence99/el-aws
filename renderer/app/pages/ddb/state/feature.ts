import { AppState } from '../../../state/app';
import { DDBFiltersState } from './ddbfilters';
import { DDBFiltersStateModel } from './ddbfilters';
import { DDBSchemasState } from './ddbschemas';
import { DDBSchemasStateModel } from './ddbschemas';
import { DDBState } from './ddb';
import { DDBStateModel } from './ddb';
import { DDBViewsState } from './ddbviews';
import { DDBViewsStateModel } from './ddbviews';

// tslint:disable-next-line:no-empty-interface
export interface FeatureState extends AppState { 
  ddb: DDBStateModel;
  ddbfilters: DDBFiltersStateModel;
  ddbschemas: DDBSchemasStateModel;
  ddbviews: DDBViewsStateModel;
}

export const states = [
  DDBState,
  DDBFiltersState,
  DDBSchemasState,
  DDBViewsState
];
