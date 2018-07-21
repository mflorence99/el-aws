import * as S3 from 'aws-sdk/clients/s3';

import { Action } from '@ngxs/store';
import { Message } from '../../../state/status';
import { NgxsOnInit } from '@ngxs/store';
import { NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { PathService } from '../services/path';
import { Progress } from '../../../state/status';
import { S3ColorState } from '../state/s3color';
import { S3ColorStateModel } from '../state/s3color';
import { S3Service } from '../services/s3';
import { Select } from '@ngxs/store';
import { Selector } from '@ngxs/store';
import { SetColor } from '../state/s3color';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';
import { Store } from '@ngxs/store';
import { WatcherService } from '../services/watcher';

import { config } from '../../../config';
import { pluralize } from 'ellib';

/** NOTE: actions must come first because of AST */

export class BucketsLoaded {
  static readonly type = '[S3] buckets loaded';
  constructor(public readonly payload: { path: string, descs: Descriptor[] }) { }
}

export class CreateBucket {
  static readonly type = '[S3] create bucket';
  constructor(public readonly payload: { request: CreateBucketRequest }) { }
}

export class DeleteBucket {
  static readonly type = '[S3] delete bucket';
  constructor(public readonly payload: { path: string }) { }
}

export class DeleteObjects {
  static readonly type = '[S3] delete objects';
  constructor(public readonly payload: { paths: string[] }) { }
}

export class DirectoryLoaded {
  static readonly type = '[S3] directory loaded';
  constructor(public readonly payload: { path: string, descs: Descriptor[] }) { }
}

export class ExtendDirectory {
  static readonly type = '[S3] extend directory';
  constructor(public readonly payload: { path: string, token: string, versioning: boolean, extensionNum: number }) { }
}

export class FileVersionsLoaded {
  static readonly type = '[S3] file versions loaded';
  constructor(public readonly payload: { path: string, descs: Descriptor[] }) { }
}

export class LoadBuckets {
  static readonly type = '[S3] load buckets';
  constructor(public readonly payload: { force?: boolean }) { }
}

export class LoadDirectory {
  static readonly type = '[S3] load directory';
  constructor(public readonly payload: { path: string, force?: boolean }) { }
}

export class LoadFileVersions {
  static readonly type = '[S3] load file versions';
  constructor(public readonly payload: { path: string, force?: boolean }) { }
}

export interface CreateBucketRequest {
  ACL: S3.BucketCannedACL;
  Bucket: S3.BucketName;
  Region: S3.BucketLocationConstraint;
  submitted?: boolean;
}

export interface Descriptor {
  account: string;
  color: string;
  icon: string;
  isBucket?: boolean;
  isDirectory?: boolean;
  isFile?: boolean;
  isFileVersion?: boolean;
  isFileVersioned?: boolean;
  name: string;
  owner: string;
  path: string;
  size: number;
  storage: string;
  timestamp: Date;
}

export interface S3StateModel {
  [path: string]: Descriptor[];
}

@State<S3StateModel>({
  name: 's3',
  defaults: { }
}) export class S3State implements NgxsOnInit {

  @Selector() static getBuckets(state: S3StateModel): Descriptor[] {
    return state[config.s3.delimiter].sort((a, b) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }

  @Select(S3ColorState) s3color$: Observable<S3ColorStateModel>;

  s3color = { } as S3ColorStateModel;

  /** ctor */
  constructor(private path: PathService,
              private s3Svc: S3Service,
              private store: Store,
              private watcher: WatcherService,
              private zone: NgZone) { }

  @Action(BucketsLoaded)
  bucketsLoaded({ patchState }: StateContext<S3StateModel>,
                { payload }: BucketsLoaded) {
    const { path, descs } = payload;
    patchState({ [path]: descs });
  }

  @Action(CreateBucket)
  createBucket({ dispatch }: StateContext<S3StateModel>,
               { payload }: CreateBucket) {
    const { request } = payload;
    dispatch(new Message({ text: `Creating bucket ${request.Bucket} ...` }));
    this.s3Svc.createBucket(request, () => {
      this.zone.run(() => {
        dispatch(new Message({ text: `Bucket ${request.Bucket} created` }));
      });
    });
  }

  @Action(DeleteBucket)
  deleteBucket({ dispatch }: StateContext<S3StateModel>,
               { payload }: DeleteBucket) {
    const { path } = payload;
    dispatch(new Message({ text: `Deleting bucket ${path} ...` }));
    this.s3Svc.deleteBucket(path, () => {
      this.zone.run(() => {
        dispatch(new Message({ text: `Deleted bucket ${path}` }));
      });
    });
  }

  @Action(DeleteObjects)
  deleteObjects({ dispatch }: StateContext<S3StateModel>,
                { payload }: DeleteObjects) {
    const { paths } = payload;
    dispatch(new Message({ text: `Deleting objects ...` }));
    dispatch(new Progress({ state: 'running' }));
    this.s3Svc.deleteObjects(paths, () => {
      this.zone.run(() => {
        let text = '';
        if (paths.length === 1)
          text = `${paths[0]} deleted`;
        else if (paths.length > 1) {
          const others = pluralize(paths.length, {
            '=1': 'one other', 'other': '# others'
          });
          text = `${paths[0]} and ${others} selected`;
        }
        dispatch(new Message({ text }));
        dispatch(new Progress({ state: 'completed' }));
      });
    });
  }

  @Action(DirectoryLoaded)
  directoryLoaded({ patchState }: StateContext<S3StateModel>,
                  { payload }: DirectoryLoaded) {
    const { path, descs } = payload;
    patchState({ [path]: descs });
  }

  @Action(ExtendDirectory)
  extendDirectory({ dispatch, getState }: StateContext<S3StateModel>,
                  { payload }: ExtendDirectory) {
    const { path, token, versioning, extensionNum } = payload;
    this.s3Svc.extendDirectory(path, token, versioning, extensionNum,
                                (bucket: S3.BucketName,
                                 prefixes: S3.CommonPrefixList,
                                 contents: S3.ObjectList,
                                 truncated: S3.IsTruncated,
                                 token: S3.Token,
                                 versioning: boolean,
                                 extensionNum: number) => {
      const dirs = prefixes.map((prefix: S3.CommonPrefix) => {
        return this.makeDescriptorForDirectory(bucket, prefix);
      });
      const files = contents
        .filter((content: S3.Object) => !content.Key.endsWith(config.s3.delimiter))
        .map((content: S3.Object) => {
          return this.makeDescriptorForFile(path, content, versioning);
        });
      let descs = dirs.concat(files);
      this.zone.run(() => {
        if (descs.length > 0) {
          descs = getState()[path].concat(descs);
          dispatch(new DirectoryLoaded({ path, descs }));
        }
        dispatch(new Message({ text: `Extended ${path}` }));
        // keep going if there's more
        if (truncated && token && (descs.length < config.s3.maxDescs) && (extensionNum < config.s3.maxDirExtensions))
          dispatch(new ExtendDirectory({ path, token, versioning, extensionNum: extensionNum + 1 }));
      });
    });
  }

  @Action(FileVersionsLoaded)
  fileVersionsLoaded({ patchState }: StateContext<S3StateModel>,
                     { payload }: FileVersionsLoaded) {
    const { path, descs } = payload;
    patchState({ [path]: descs });
  }

  @Action(LoadBuckets)
  loadBuckets({ dispatch, getState }: StateContext<S3StateModel>,
              { payload }: LoadBuckets) {
    const { force } = payload;
    const state = getState();
    let descs = state[config.s3.delimiter];
    if (!force && descs)
      dispatch(new BucketsLoaded({ path: config.s3.delimiter, descs }));
    else {
      dispatch(new Message({ text: 'Loading buckets ...' }));
      this.s3Svc.loadBuckets((buckets: S3.Buckets, 
                              owner: S3.Owner, 
                              locations: string[]) => {
        descs = buckets.map((bucket: S3.Bucket, ix) => {
          return this.makeDescriptorForBucket(bucket, owner, locations[ix]);
        });
        this.zone.run(() => {
          dispatch(new BucketsLoaded({ path: config.s3.delimiter, descs }));
          dispatch(new Message({ text: 'Buckets loaded' }));
        });
      });
    }
  }

  @Action(LoadDirectory)
  loadDirectory({ dispatch, getState }: StateContext<S3StateModel>,
                { payload }: LoadDirectory) {
    const { path, force } = payload;
    const state = getState();
    // NOTE: a path of just / is really the buckets themselves
    // NOTE: a path that doesn't end in / is a file
    if (path === config.s3.delimiter)
      dispatch(new LoadBuckets({ force }));
    else if (!path.endsWith(config.s3.delimiter))
      dispatch(new LoadFileVersions({ path, force }));
    else {
      let descs = state[path];
      if (!force && descs)
        dispatch(new DirectoryLoaded({ path, descs }));
      else {
        dispatch(new Message({ text: `Loading ${path} ...` }));
        this.s3Svc.loadDirectory(path, 
                                  (bucket: S3.BucketName,
                                   prefixes: S3.CommonPrefixList,
                                   contents: S3.ObjectList,
                                   truncated: S3.IsTruncated,
                                   token: S3.Token,
                                   versioning: boolean) => {
          const dirs = prefixes.map((prefix: S3.CommonPrefix) => {
            return this.makeDescriptorForDirectory(bucket, prefix);
          });
          const files = contents
            .filter((content: S3.Object) => !content.Key.endsWith(config.s3.delimiter))
            .map((content: S3.Object) => {
              return this.makeDescriptorForFile(path, content, versioning);
            });
          descs = dirs.concat(files);
          this.zone.run(() => {
            dispatch(new DirectoryLoaded({ path, descs }));
            dispatch(new Message({ text: `Loaded ${path}` }));
            // keep going if there's more
            if (truncated && token && (descs.length < config.s3.maxDescs))
              dispatch(new ExtendDirectory({ path, token, versioning, extensionNum: 1 }));
          });
        });
      }
    }
  }

  @Action(LoadFileVersions)
  loadFileVersions({ dispatch, getState }: StateContext<S3StateModel>,
                   { payload }: LoadFileVersions) {
    const { path, force } = payload;
    const state = getState();
    let descs = state[path];
    if (!force && descs)
      dispatch(new FileVersionsLoaded({ path, descs }));
    else {
      dispatch(new Message({ text: `Loading versions for ${path} ...` }));
      this.s3Svc.loadFileVersions(path, (versions: S3.ObjectVersionList) => {
        descs = versions
          // NOTE: that's an odd encoding but it is what the tests reveal
          .filter((version: S3.ObjectVersion) => !version.IsLatest && version.VersionId && (version.VersionId !== 'null'))
          .map((version: S3.ObjectVersion) => {
            return this.makeDescriptorForFileVersion(path, version);
          });
        this.zone.run(() => {
          dispatch(new FileVersionsLoaded({ path, descs }));
          dispatch(new Message({ text: `Loaded versions for ${path}` }));
        });
      });
    }
  }

  // lifecycle methods

  ngxsOnInit({ dispatch, getState }: StateContext<S3StateModel>) {
    this.s3color$.subscribe((s3color: S3ColorStateModel) => this.s3color = s3color);
    this.watcher.stream$.subscribe((path: string) => {
      const { directory, isDirectory, isFile, isRoot } = this.path.analyze(path);
      if (isRoot)
        dispatch(new LoadDirectory({ path: config.s3.delimiter, force: true }));
      else if (isDirectory)
        dispatch(new LoadDirectory({ path, force: true }));
      else if (isFile) {
        dispatch(new LoadDirectory({ path: directory, force: true }));
        // NOTE: we don't know directly if this file has versions
        // but we do know that any entry in the parent directory is versioned
        const descs = getState()[directory];
        if (descs && (descs.length > 0) && descs[0].isFileVersioned)
          dispatch(new LoadFileVersions({ path, force: true }));
      }
    });
  }

  // private methods

  private extractName(path: string): string {
    if (path.endsWith(config.s3.delimiter))
      path = path.substring(0, path.length - 1);
    const parts = path.split(config.s3.delimiter);
    return parts[parts.length - 1];
  }

  private makeColor(name: string): string {
    const ix = name.lastIndexOf('.');
    if (ix <= 0)
      return 'var(--mat-blue-grey-400)';
    else {
      const ext = name.substring(ix + 1).toLowerCase();
      let color = this.s3color[ext];
      if (!color) {
        color = config.s3.colors[Math.trunc(Math.random() * config.s3.colors.length)];
        this.store.dispatch(new SetColor({ ext, color }));
      }
      return color;
    }
  }

  private makeDescriptorForBucket(bucket: S3.Bucket,
                                  owner: S3.Owner,
                                  location: string): Descriptor {
    return {
      account: owner.ID,
      color: 'var(--mat-brown-400)',
      icon: 'fab bitbucket',
      isBucket: true,
      name: bucket.Name,
      owner: owner.DisplayName,
      path: bucket.Name + config.s3.delimiter,
      size: 0,
      storage: location,
      timestamp: new Date(bucket.CreationDate)
    };
  }

  private makeDescriptorForDirectory(bucket: string,
                                     prefix: S3.CommonPrefix): Descriptor {
    return {
      account: null,
      color: 'var(--mat-deep-orange-a100)',
      icon: 'fas folder',
      isDirectory: true,
      name: this.extractName(prefix.Prefix),
      owner: null,
      path: bucket + config.s3.delimiter + prefix.Prefix,
      size: 0,
      storage: null,
      timestamp: null
    };
  }

  private makeDescriptorForFile(path: string,
                                content: S3.Object,
                                versioning: boolean): Descriptor {
    const name = this.extractName(content.Key);
    return {
      account: content.Owner ? content.Owner.ID : null, 
      color: this.makeColor(name),
      icon: this.makeIcon(name),
      isFile: true,
      isFileVersioned: versioning,
      name: name,
      owner: content.Owner? content.Owner.DisplayName : null,
      path: path + name,
      size: content.Size,
      storage: content.StorageClass,
      timestamp: new Date(content.LastModified)
    };
  }

  private makeDescriptorForFileVersion(path: string,
                                       version: S3.ObjectVersion): Descriptor {
    const fileName = this.extractName(path);
    return {
      account: null,
      color: 'var(--mat-blue-grey-400)',
      icon: this.makeIcon(fileName),
      isFileVersion: true,
      name: version.VersionId,
      owner: version.Owner? version.Owner.DisplayName : null,
      path: path + '?versionid=' + version.VersionId,
      size: version.Size,
      storage: version.StorageClass,
      timestamp: new Date(version.LastModified)
    };
  }

  private makeIcon(name: string): string {
    let icon = null;
    const ix = name.lastIndexOf('.');
    if (ix <= 0)
      icon = config.s3.iconByName[name.toLowerCase()];
    else {
      const ext = name.substring(ix + 1).toLowerCase();
      icon = config.s3.iconByExt[ext];
    }
    return icon ? icon : 'far file';
  }

}
