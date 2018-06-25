import * as S3 from 'aws-sdk/clients/s3';

import { Action } from '@ngxs/store';
import { LoadBucketMetadata } from './s3meta';
import { Message } from '../../../state/status';
import { NgxsOnInit } from '@ngxs/store';
import { NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { S3ColorState } from '../state/s3color';
import { S3ColorStateModel } from '../state/s3color';
import { S3Service } from '../services/s3';
import { Select } from '@ngxs/store';
import { SetColor } from '../state/s3color';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';
import { Store } from '@ngxs/store';

import { config } from '../../../config';

/** NOTE: actions must come first because of AST */

export class BucketsLoaded {
  static readonly type = '[S3] buckets loaded';
  constructor(public readonly payload: { path: string, descs: Descriptor[] }) { }
}

export class DirectoryLoaded {
  static readonly type = '[S3] directory loaded';
  constructor(public readonly payload: { path: string, descs: Descriptor[] }) { }
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

export interface Descriptor {
  color: string;
  icon: string;
  isBucket?: boolean;
  isDirectory?: boolean;
  isFile?: boolean;
  isFileVersion?: boolean;
  name: string;
  owner: string;
  path: string;
  size: number;
  storage: string;
  timestamp: Date;
  versioning?: boolean;
}

export interface S3StateModel {
  [path: string]: Descriptor[];
}

@State<S3StateModel>({
  name: 's3',
  defaults: {}
}) export class S3State implements NgxsOnInit {

  @Select(S3ColorState) s3color$: Observable<S3ColorStateModel>;

  s3color = {} as S3ColorStateModel;

  /** ctor */
  constructor(private s3Svc: S3Service,
              private store: Store,
              private zone: NgZone) { }

  @Action(BucketsLoaded)
  bucketsLoaded({ patchState }: StateContext<S3StateModel>,
                { payload }: BucketsLoaded) {
    const { path, descs } = payload;
    patchState({ [path]: descs });
  }

  @Action(DirectoryLoaded)
  directoryLoaded({ patchState }: StateContext<S3StateModel>,
                  { payload }: DirectoryLoaded) {
    const { path, descs } = payload;
    patchState({ [path]: descs });
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
    let descs = state[config.s3Delimiter];
    if (!force && descs)
      dispatch(new BucketsLoaded({ path: config.s3Delimiter, descs }));
    else {
      dispatch(new Message({ text: 'Loading buckets ...' }));
      this.s3Svc.loadBuckets((buckets: S3.Buckets, 
                              owner: S3.Owner, 
                              locations: string[]) => {
        descs = buckets.map((bucket: S3.Bucket, ix) => {
          dispatch(new LoadBucketMetadata({ path: bucket.Name + config.s3Delimiter }));
          return this.makeDescriptorForBucket(bucket, owner, locations[ix]);
        });
        this.zone.run(() => {
          dispatch(new BucketsLoaded({ path: config.s3Delimiter, descs }));
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
    if (path === '/')
      dispatch(new LoadBuckets({ force }));
    else if (!path.endsWith('/'))
      dispatch(new LoadFileVersions({ path, force }));
    else {
      let descs = state[path];
      if (!force && descs)
        dispatch(new DirectoryLoaded({ path, descs }));
      else {
        dispatch(new Message({ text: `Loading ${path} ...` }));
        this.s3Svc.loadDirectory(path, 
                                  (bucket: string,
                                   prefixes: S3.CommonPrefixList,
                                   contents: S3.ObjectList) => {
          const dirs = prefixes.map((prefix: S3.CommonPrefix) => {
            return this.makeDescriptorForDirectory(bucket, prefix);
          });
          const files = contents
            // TODO: I don't understand how these exist -- directories are phantoms!
            .filter((content: S3.Object) => !content.Key.endsWith(config.s3Delimiter))
            .map((content: S3.Object) => {
              return this.makeDescriptorForFile(path, content);
            });
          descs = dirs.concat(files);
          this.zone.run(() => {
            dispatch(new DirectoryLoaded({ path, descs }));
            dispatch(new Message({ text: `Loaded ${path}` }));
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
          .filter((version: S3.ObjectVersion) => version.VersionId && (version.VersionId !== 'null'))
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

  ngxsOnInit({ dispatch }: StateContext<S3StateModel>) {
    this.s3color$.subscribe((s3color: S3ColorStateModel) => this.s3color = s3color);
  }

  // private methods

  private extractName(path: string): string {
    if (path.endsWith(config.s3Delimiter))
      path = path.substring(0, path.length - 1);
    const parts = path.split(config.s3Delimiter);
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
        color = config.s3Colors[Math.trunc(Math.random() * config.s3Colors.length)];
        this.store.dispatch(new SetColor({ ext, color }));
      }
      return color;
    }
  }

  private makeDescriptorForBucket(bucket: S3.Bucket,
                                  owner: S3.Owner,
                                  location: string): Descriptor {
    return {
      color: 'var(--mat-brown-400)',
      icon: 'fab bitbucket',
      isBucket: true,
      name: bucket.Name,
      owner: owner.DisplayName,
      path: bucket.Name + config.s3Delimiter,
      size: 0,
      storage: location,
      timestamp: new Date(bucket.CreationDate)
    };
  }

  private makeDescriptorForDirectory(bucket: string,
                                     prefix: S3.CommonPrefix): Descriptor {
    return {
      color: 'var(--mat-deep-orange-a100)',
      icon: 'fas folder',
      isDirectory: true,
      name: this.extractName(prefix.Prefix),
      owner: null,
      path: bucket + config.s3Delimiter + prefix.Prefix,
      size: 0,
      storage: null,
      timestamp: null
    };
  }

  private makeDescriptorForFile(path: string,
                                content: S3.Object): Descriptor {
    const name = this.extractName(content.Key);
    return {
      color: this.makeColor(name),
      icon: this.makeIcon(name),
      isFile: true,
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
      icon = config.s3IconByName[name.toLowerCase()];
    else {
      const ext = name.substring(ix + 1).toLowerCase();
      icon = config.s3IconByExt[ext];
    }
    return icon ? icon : 'far file';
  }

}
