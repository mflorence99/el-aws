import { AppState } from '../../../state/app';
import { S3ColorState } from './s3color';
import { S3ColorStateModel } from './s3color';
import { S3MetaState } from './s3meta';
import { S3MetaStateModel } from './s3meta';
import { S3SelectionState } from './s3selection';
import { S3SelectionStateModel } from './s3selection';
import { S3State } from './s3';
import { S3StateModel } from './s3';
import { S3ViewState } from './s3view';
import { S3ViewStateModel } from './s3view';

export interface FeatureState extends AppState {
  s3: S3StateModel;
  s3color: S3ColorStateModel;
  s3meta: S3MetaStateModel;
  s3selection: S3SelectionStateModel;
  s3view: S3ViewStateModel;
}

export const states = [
  S3State,
  S3ColorState,
  S3MetaState,
  S3SelectionState,
  S3ViewState
];
