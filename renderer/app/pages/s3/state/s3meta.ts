import * as S3 from 'aws-sdk/clients/s3';

import { Action } from '@ngxs/store';
import { NgxsOnInit } from '@ngxs/store';
import { NgZone } from '@angular/core';
import { PathService } from '../services/path';
import { S3Service } from '../services/s3';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';
import { WatcherService } from '../services/watcher';

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
  acceleration: BucketMetadataAcceleration;
  acl: BucketMetadataAcl;
  encryption: BucketMetadataEncryption;
  loading?: boolean;
  logging: BucketMetadataLogging;
  tagging: BucketMetadataTagging;
  versioning: BucketMetadataVersioning;
  website: BucketMetadataWebsite;
}

export interface BucketMetadataAcceleration {
  Status: S3.BucketAccelerateStatus;
}

export interface BucketMetadataAcl {
  Grants: BucketMetadataAclGrant[];
  Owner: S3.ID;
  Summary: 'Private' | 'Public';
}

export interface BucketMetadataAclGrant {
  Grantee: 'Private access' | 'Public access' | 'S3 log delivery';
  ReadAcl: boolean;
  ReadObjects: boolean;
  WriteAcl: boolean;
  WriteObjects: boolean;
}

export interface BucketMetadataEncryption {
  KMSMasterKeyID?: S3.SSEKMSKeyId;
  SSEAlgorithm: S3.ServerSideEncryption;
}

export interface BucketMetadataLogging {
  LoggingEnabled: string;
  TargetBucket: S3.TargetBucket;
  TargetPrefix: S3.TargetPrefix;
}

export interface BucketMetadataTagging {
  TagSet: S3.TagSet;
}

export interface BucketMetadataVersioning {
  Status: S3.BucketVersioningStatus;
}

export interface BucketMetadataWebsite {
  ErrorDocument: S3.ObjectKey;
  IndexDocument: S3.Suffix;
  RedirectHostName: S3.HostName;
  RedirectProtocol: S3.Protocol;
  WebsiteEnabled: string;
}

export interface FileMetadata {
  acl: FileMetadataAcl;
  head: FileMetadataHead;
  loading?: boolean;
  tagging: FileMetadataTagging;
}

export interface FileMetadataAcl {
  Grants: FileMetadataAclGrant[];
  Owner: S3.ID;
  Summary: 'Private' | 'Public';
}

export interface FileMetadataAclGrant {
  Grantee: 'Private access' | 'Public access';
  ReadAcl: boolean;
  ReadObjects: boolean;
  WriteAcl: boolean;
  WriteObjects: boolean;
}

export interface FileMetadataHead {
  encryption: {
    KMSMasterKeyID?: S3.SSEKMSKeyId;
    SSEAlgorithm: S3.ServerSideEncryption;
  };
  metadata: {
    CacheControl?: S3.CacheControl;
    ContentDisposition?: S3.ContentDisposition;
    ContentEncoding?: S3.ContentEncoding;
    ContentLanguage?: S3.ContentLanguage;
    ContentType?: S3.ContentType;
    Expires?: S3.Expires;
    WebsiteRedirectLocation?: S3.WebsiteRedirectLocation;
  };
  storage: {
    StorageClass: S3.StorageClass;
  };
  touched: {
    encryption: boolean;
    metadata: boolean;
    storage: boolean;
  };
}

export interface FileMetadataTagging {
  TagSet: S3.TagSet;
}

export interface S3MetaStateModel {
  [path: string]: BucketMetadata | FileMetadata;
}

@State<S3MetaStateModel>({
  name: 's3meta',
  defaults: { }
}) export class S3MetaState implements NgxsOnInit {

  /** ctor */
  constructor(private path: PathService,
              private s3Svc: S3Service,
              private watcher: WatcherService,
              private zone: NgZone) { }

  @Action(BucketMetadataLoaded)
  bucketMetadataLoaded({ patchState }: StateContext<S3MetaStateModel>,
                       { payload }: BucketMetadataLoaded) {
    const { path, metadata } = payload;
    patchState({ [path]: metadata });
    // watch for changes
    this.watcher.watch(path);
  }

  @Action(FileMetadataLoaded)
  fileMetadataLoaded({ patchState }: StateContext<S3MetaStateModel>,
                     { payload }: FileMetadataLoaded) {
    const { path, metadata } = payload;
    patchState({ [path]: metadata });
    // watch for changes
    this.watcher.watch(path);
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
      patchState({ [path]: <any>(metadata? { ...metadata, ...loading } : loading ) });
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
      patchState({ [path]: <any>(metadata? { ...metadata, ...loading } : loading) });
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
    this.s3Svc.updateBucketMetadata(path, metadata);
  }

  @Action(UpdateFileMetadata)
  updateFileMetadata({ dispatch, patchState }: StateContext<S3MetaStateModel>,
                     { payload }: UpdateFileMetadata) {
    const { path, metadata } = payload;
    patchState({ [path]: { ...metadata, loading: true } });
    this.s3Svc.updateFileMetadata(path, metadata);
  }

  // lifecycle methods

  ngxsOnInit({ dispatch }: StateContext<S3MetaStateModel>) {
    this.watcher.stream$.subscribe((path: string) => {
      const { isBucket, isFile } = this.path.analyze(path);
      if (isBucket)
        dispatch(new LoadBucketMetadata( { path, force: true }));
      else if (isFile)
        dispatch(new LoadFileMetadata({ path, force: true }));
    });
  }

}
