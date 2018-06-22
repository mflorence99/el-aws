import * as S3 from 'aws-sdk/clients/s3';

import { Action } from '@ngxs/store';
import { Message } from '../../../state/status';
import { NgZone } from '@angular/core';
import { S3ColorStateModel } from '../state/s3color';
import { S3Service } from '../services/s3';
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
  static readonly type = '[S3] durectory loaded';
  constructor(public readonly payload: { path: string, descs: Descriptor[] }) { }
}

export class LoadBuckets {
  static readonly type = '[S3] load buckets';
  constructor(public readonly payload?: any) { }
}

export class LoadDirectory {
  static readonly type = '[S3] load directory';
  constructor(public readonly payload: { path: string }) { }
}

export interface Descriptor {
  color: string;
  icon: string;
  isBucket?: boolean;
  isDirectory?: boolean;
  isFile?: boolean;
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
  defaults: {}
}) export class S3State {

  s3color = {} as S3ColorStateModel;

  /** ctor */
  constructor(private s3Svc: S3Service,
              private store: Store,
              private zone: NgZone) { }

  @Action(BucketsLoaded)
  bucketsLoaded({ dispatch, patchState }: StateContext<S3StateModel>,
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

  @Action(LoadBuckets)
  loadBuckets({ dispatch, getState }: StateContext<S3StateModel>,
              { payload }: LoadBuckets) {
    const state = getState();
    if (!state[config.s3Delimiter]) {
      dispatch(new Message({ text: 'Loading buckets ...' }));
      this.s3Svc.loadBuckets((buckets: S3.Buckets, 
                              owner: S3.Owner, 
                              locations: string[]) => {
        const descs = buckets.map((bucket: S3.Bucket, ix) => {
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
    const { path } = payload;
    const state = getState();
    if (!state[path]) {
      dispatch(new Message({ text: `Loading ${path} ...` }));
      this.s3Svc.loadDirectory(path, (contents: S3.ObjectList) => {
        dispatch(new Message({ text: `Loaded ${path}` }));
      });
    }
  }

  // private methods

  private makeColor(desc: Descriptor): string {
    if (desc.isBucket)
      return 'var(--mat-deep-orange-a100)';
    else if (desc.isDirectory)
      return 'var(--mat-deep-orange-a100)';
    else if (desc.isFile) {
      const ix = desc.name.lastIndexOf('.');
      if (ix <= 0)
        return 'var(--mat-blue-grey-400)';
      else {
        const ext = desc.name.substring(ix + 1).toLowerCase();
        let color = this.s3color[ext];
        if (!color) {
          color = config.s3Colors[Math.trunc(Math.random() * config.s3Colors.length)];
          this.store.dispatch(new SetColor({ ext, color }));
        }
        return color;
      }
    }
    else return 'var(--mat-blue-grey-400)';
  }

  private makeDescriptorForBucket(bucket: S3.Bucket,
                                  owner: S3.Owner,
                                  location: string): Descriptor {
    const desc = {
      color: null,
      icon: null,
      isBucket: true,
      name: bucket.Name,
      owner: owner.DisplayName,
      path: bucket.Name,
      size: 0,
      storage: location,
      timestamp: new Date(bucket.CreationDate)
    };
    // fill in the blanks
    desc.color = this.makeColor(desc);
    desc.icon = this.makeIcon(desc);
    return desc;
  }

  private makeIcon(desc: Descriptor): string {
    if (desc.isBucket)
      return 'fab bitbucket';
    else if (desc.isDirectory)
      return 'fas folder';
    else if (desc.isFile) {
      let icon = null;
      const ix = desc.name.lastIndexOf('.');
      if (ix <= 0)
        icon = config.s3IconByName[desc.name.toLowerCase()];
      else {
        const ext = desc.name.substring(ix + 1).toLowerCase();
        icon = config.s3IconByExt[ext];
      }
      return icon ? icon : 'far file';
    }
    else return 'far file';
  }

}
