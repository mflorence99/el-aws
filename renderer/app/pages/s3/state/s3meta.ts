import * as S3 from 'aws-sdk/clients/s3';

import { Action } from '@ngxs/store';
import { Message } from '../../../state/status';
import { NgZone } from '@angular/core';
import { S3Service } from '../services/s3';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class FileMetadataLoaded {
  static readonly type = '[S3Meta] file metadata loaded';
  constructor(public readonly payload: { path: string, meta: FileMetadata }) { }
}

export class LoadFileMetadata {
  static readonly type = '[S3Meta] load file metadata';
  constructor(public readonly payload: { path: string }) { }
}

export interface FileMetadata {
  dummy?: string;
}

export interface S3MetaStateModel {
  [path: string]: FileMetadata;
}

@State<S3MetaStateModel>({
  name: 's3meta',
  defaults: {}
}) export class S3MetaState {

  /** ctor */
  constructor(private s3Svc: S3Service,
              private zone: NgZone) { }

  @Action(FileMetadataLoaded)
  fileMetadataLoaded({ patchState }: StateContext<S3MetaStateModel>,
                     { payload }: FileMetadataLoaded) {
    const { path, meta } = payload;
    patchState({ [path]: meta });
  }

  @Action(LoadFileMetadata)
  loadFileMetadata({ dispatch, getState }: StateContext<S3MetaStateModel>,
                   { payload }: LoadFileMetadata) {
    const { path } = payload;
    const state = getState();
    if (!state[path]) {
      dispatch(new Message({ text: `Loading metadata for ${path} ...` }));
      this.s3Svc.loadFileMetadata(path, (metaData: S3.HeadObjectOutput) => {
        const meta = { } as FileMetadata;
        this.zone.run(() => {
          dispatch(new FileMetadataLoaded({ path, meta }));
          dispatch(new Message({ text: `Loaded metadata for ${path}` }));
        });

      });
    }
  }

}
