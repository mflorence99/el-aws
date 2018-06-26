import { Action } from '@ngxs/store';
import { BucketMetadata } from '../services/s3';
import { FileMetadata } from '../services/s3';
import { Message } from '../../../state/status';
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
  loadBucketMetadata({ dispatch, getState }: StateContext<S3MetaStateModel>,
                     { payload }: LoadBucketMetadata) {
    const { path, force } = payload;
    const state = getState();
    const metadata = <BucketMetadata>state[path];
    if (!force && metadata)
      dispatch(new BucketMetadataLoaded({ path, metadata }));
    else {
      dispatch(new Message({ text: `Loading metadata for ${path} ...` }));
      this.s3Svc.loadBucketMetadata(path, (metadata: BucketMetadata) => {
        this.zone.run(() => {
          dispatch(new BucketMetadataLoaded({ path, metadata }));
          dispatch(new Message({ text: `Loaded metadata for ${path}` }));
        });
      });
    }
  }

  @Action(LoadFileMetadata)
  loadFileMetadata({ dispatch, getState }: StateContext<S3MetaStateModel>,
                   { payload }: LoadFileMetadata) {
    const { path, force } = payload;
    const state = getState();
    const metadata = <FileMetadata>state[path];
    if (!force && metadata)
      dispatch(new FileMetadataLoaded({ path, metadata }));
    else {
      dispatch(new Message({ text: `Loading metadata for ${path} ...` }));
      this.s3Svc.loadFileMetadata(path, (metadata: FileMetadata) => {
        this.zone.run(() => {
          dispatch(new FileMetadataLoaded({ path, metadata }));
          dispatch(new Message({ text: `Loaded metadata for ${path}` }));
        });
      });
    }
  }

  @Action(UpdateBucketMetadata)
  updateBucketMetadata({ dispatch }: StateContext<S3MetaStateModel>,
                       { payload }: UpdateBucketMetadata) {
    const { path, metadata } = payload;
    this.s3Svc.updateBucketMetadata(path, metadata, () => {
      dispatch(new LoadBucketMetadata({ path, force: true }));
    });
  }

  @Action(UpdateFileMetadata)
  updateFileMetadata({ dispatch, getState }: StateContext<S3MetaStateModel>,
                     { payload }: UpdateFileMetadata) {
    // const { path, metadata } = payload;
    // const state = getState();
  }

}
