import { AppState } from '../../../state/app';
import { S3ColorState } from './s3color';
import { S3ColorStateModel } from './s3color';
import { S3State } from './s3';
import { S3StateModel } from './s3';
import { S3ViewState } from './s3view';
import { S3ViewStateModel } from './s3view';

export interface FeatureState extends AppState {
  s3: S3StateModel;
  s3color: S3ColorStateModel;
  s3view: S3ViewStateModel;
}

export const states = [
  S3State,
  S3ColorState,
  S3ViewState
];
