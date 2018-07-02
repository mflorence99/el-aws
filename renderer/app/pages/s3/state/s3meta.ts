import * as S3 from 'aws-sdk/clients/s3';

import { Action } from '@ngxs/store';
import { NgZone } from '@angular/core';
import { S3Service } from '../services/s3';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class BucketMetadataLoaded {
  static readonly type = '[S3Meta] bucket metadata loaded';
  constructor(public readonly payload: { path: string, metadata: BucketMetadata }) { }
}

export class FileMetadataLoaded {
  static readonly type = '[S3Meta] file metadata loaded';
  constructor(public readonly payload: { path: string, metadata: FileMetadata }) { }
}

export class LoadBucketMetadata {
  static readonly type = '[S3Meta] load bucket metadata';
  constructor(public readonly payload: { path: string, force?: boolean }) { }
}

export class LoadFileMetadata {
  static readonly type = '[S3Meta] load file metadata';
  constructor(public readonly payload: { path: string, force?: boolean }) { }
}

export class UpdateBucketMetadata {
  static readonly type = '[S3Meta] update bucket metadata';
  constructor(public readonly payload: { path: string, metadata: BucketMetadata }) { }
}

export class UpdateFileMetadata {
  static readonly type = '[S3Meta] update file metadata';
  constructor(public readonly payload: { path: string, metadata: FileMetadata }) { }
}

export interface BucketMetadata {
  accelerate: S3.GetBucketAccelerateConfigurationOutput;
  acl?: S3.GetBucketAclOutput;
  encryption?: S3.GetBucketEncryptionOutput;
  loading?: boolean;
  logging?: S3.GetBucketLoggingOutput;
  tagging?: S3.GetBucketTaggingOutput;
  versioning?: S3.GetBucketVersioningOutput;
  website?: S3.GetBucketWebsiteOutput;
}

export interface FileMetadata {
  acl?: S3.GetObjectAclOutput;
  loading?: boolean;
  tagging?: S3.GetObjectTaggingOutput;
}

export interface S3MetaStateModel {
  [path: string]: BucketMetadata | FileMetadata;
}

@State<S3MetaStateModel>({
  name: 's3meta',
  defaults: {}
}) export class S3MetaState {

  /** ctor */
  constructor(private s3Svc: S3Service,
              private zone: NgZone) { }

  @Action(BucketMetadataLoaded)
  bucketMetadataLoaded({ patchState }: StateContext<S3MetaStateModel>,
                       { payload }: BucketMetadataLoaded) {
    const { path, metadata } = payload;
    patchState({ [path]: metadata });
  }

  @Action(FileMetadataLoaded)
  fileMetadataLoaded({ patchState }: StateContext<S3MetaStateModel>,
                     { payload }: FileMetadataLoaded) {
    const { path, metadata } = payload;
    patchState({ [path]: metadata });
  }

  @Action(LoadBucketMetadata)
  loadBucketMetadata({ dispatch, getState, patchState }: StateContext<S3MetaStateModel>,
                     { payload }: LoadBucketMetadata) {
    const { path, force } = payload;
    const state = getState();
    const metadata = <BucketMetadata>state[path];
    if (!force && metadata)
      dispatch(new BucketMetadataLoaded({ path, metadata }));
    else {
      const loading = { loading: true };
      patchState({ [path]: (metadata? { ...metadata, ...loading } : loading ) });
      this.s3Svc.loadBucketMetadata(path, (metadata: BucketMetadata) => {
        this.zone.run(() => {
          dispatch(new BucketMetadataLoaded({ path, metadata }));
        });
      });
    }
  }

  @Action(LoadFileMetadata)
  loadFileMetadata({ dispatch, getState, patchState }: StateContext<S3MetaStateModel>,
                   { payload }: LoadFileMetadata) {
    const { path, force } = payload;
    const state = getState();
    const metadata = <FileMetadata>state[path];
    if (!force && metadata)
      dispatch(new FileMetadataLoaded({ path, metadata }));
    else {
      const loading = { loading: true };
      patchState({ [path]: (metadata ? { ...metadata, ...loading } : loading) });
      this.s3Svc.loadFileMetadata(path, (metadata: FileMetadata) => {
        this.zone.run(() => {
          dispatch(new FileMetadataLoaded({ path, metadata }));
        });
      });
    }
  }

  @Action(UpdateBucketMetadata)
  updateBucketMetadata({ dispatch, patchState }: StateContext<S3MetaStateModel>,
                       { payload }: UpdateBucketMetadata) {
    const { path, metadata } = payload;
    patchState({ [path]: { ...metadata, loading: true } });
    this.s3Svc.updateBucketMetadata(path, metadata, () => {
      dispatch(new LoadBucketMetadata({ path, force: true }));
    });
  }

  @Action(UpdateFileMetadata)
  updateFileMetadata({ dispatch, patchState }: StateContext<S3MetaStateModel>,
                     { payload }: UpdateFileMetadata) {
    const { path, metadata } = payload;
    patchState({ [path]: { ...metadata, loading: true } });
    this.s3Svc.updateFileMetadata(path, metadata, () => {
      dispatch(new LoadFileMetadata({ path, force: true }));
    });
  }

}
