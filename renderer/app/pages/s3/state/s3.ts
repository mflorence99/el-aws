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

export class LoadBuckets {
  static readonly type = '[S3] load buckets';
  constructor(public readonly payload?: any) { }
}

export interface Descriptor {
  color: string;
  icon: string;
  isBucket?: boolean;
  isDirectory?: boolean;
  isFile?: boolean;
  name: string;
  path: string;
  size: number;
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
  bucketsLoaded({ patchState }: StateContext<S3StateModel>,
                { payload }: BucketsLoaded) {
    const { path, descs } = payload;
    patchState({ [path]: descs });
  }

  @Action(LoadBuckets)
  loadBuckets({ dispatch }: StateContext<S3StateModel>,
              { payload }: LoadBuckets) {
    dispatch(new Message({ text: 'Loading buckets ...' }));
    this.s3Svc.loadBuckets((buckets: S3.Buckets) => {
      const descs = buckets.map((bucket: S3.Bucket) => {
        return this.makeDescriptorForBucket(bucket);
      });
      this.zone.run(() => {
        dispatch(new BucketsLoaded({ path: '/', descs }));
        dispatch(new Message({ text: 'Buckets loaded' }));
      });
    });
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

  private makeDescriptorForBucket(bucket: S3.Bucket): Descriptor {
    const desc = {
      color: null,
      icon: null,
      isBucket: true,
      name: bucket.Name,
      path: bucket.Name,
      size: 0,
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
