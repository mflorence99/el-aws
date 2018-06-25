import * as S3 from 'aws-sdk/clients/s3';

import { ElectronService } from 'ngx-electron';
import { Injectable } from '@angular/core';
import { Message } from '../../../state/status';
import { Observable } from 'rxjs';
import { PrefsState } from '../../../state/prefs';
import { PrefsStateModel } from '../../../state/prefs';
import { Select } from '@ngxs/store';
import { Store } from '@ngxs/store';

import { config } from '../../../config';

import async from 'async-es';

/**
 * Model S3 service data
 */


export interface BucketMetadata {
  acl?: S3.GetBucketAclOutput;
  head?: any;
  tagging?: S3.GetBucketTaggingOutput;
  versioning?: S3.GetBucketVersioningOutput;
}

export interface FileMetadata {
  acl?: S3.GetObjectAclOutput;
  head?: S3.HeadObjectOutput;
  tagging?: S3.GetObjectTaggingOutput;
}

/**
 * S3 service
 */

@Injectable()
export class S3Service {

  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;

  private s3: S3;

  private s3_: typeof S3;

  /** Separate bucket, prefix aka Key or object */
  static extractBucketAndPrefix(path: string): { bucket, prefix, version } {
    // @see https://stackoverflow.com/questions/30726079/aws-s3-object-listing
    let bucket, prefix, version = null;
    const ix = path.indexOf(config.s3Delimiter);
    if (ix === -1) {
      bucket = path;
      prefix = '';
    }
    else {
      bucket = path.substring(0, ix);
      prefix = path.substring(ix + 1);
    }
    if (prefix === config.s3Delimiter)
      prefix = '';
    const iy = prefix.indexOf('?versionid=');
    if (iy !== -1) {
      version = prefix.substring(iy + 11);
      prefix = prefix.substring(0, iy);
    }
    return { bucket, prefix, version };
  }

  /** ctor */
  constructor(private electron: ElectronService,
              private store: Store) {
    this.s3_ = this.electron.remote.require('aws-sdk/clients/s3');
    this.prefs$.subscribe((prefs: PrefsStateModel) => {
      this.s3 = new this.s3_({ endpoint: prefs.endpoints.s3 });
    });
  }

  /** Load bucket metadata */
  loadBucketMetadata(path: string,
                     cb: (metadata: BucketMetadata) => void): void {
    const { bucket } = S3Service.extractBucketAndPrefix(path);
    const params = { Bucket: bucket };
    const funcs = {
      accelerate: async.apply(this.s3.getBucketAccelerateConfiguration, params),
      acl: async.apply(this.s3.getBucketAcl, params),
      head: async.apply(this.s3.headBucket, params),
      tagging: async.apply(this.s3.getBucketTagging, params),
      versioning: async.apply(this.s3.getBucketVersioning, params)
    };
    async.parallelLimit(async.reflectAll(funcs), 1, (err, results: any) => {
      // NOTE: we are ignoring errors and only recording metadata actually found
      // reason: a bucket with no tags for example errors on the tagging call
      const metadata = Object.keys(funcs).reduce((acc, key) => {
        acc[key] = results[key].value || { };
        return acc;
      }, { } as BucketMetadata);
      cb(metadata);
    });
  }

  /** Load all buckets, augmenting them with owner and location */
  loadBuckets(cb: (buckets: S3.Buckets, 
                   owner: S3.Owner,
                   locations: string[]) => void): void {
    this.s3.listBuckets((err, data: S3.ListBucketsOutput) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString()}));
      else {
        const params = data.Buckets.map(bucket => ({ Bucket: bucket.Name }));
        async.map(params, this.s3.getBucketLocation, 
          (err, results: S3.GetBucketLocationOutput[]) => {
            if (err)
              this.store.dispatch(new Message({ level: 'error', text: err.toString()}));
            else {
              // an empty string means us-east-1
              // @see https://docs.aws.amazon.com/AmazonS3/
              //       latest/API/RESTBucketGETlocation.html
              const locations = results.map(result => result.LocationConstraint || 'us-east-1');
              cb(data.Buckets, data.Owner, locations);
            }
          });
      }
    });
  }

  /** Load the contents of a "directory" */
  loadDirectory(path: string,
                cb: (bucket: string,
                     prefixes: S3.CommonPrefixList,
                     contents: S3.ObjectList) => void): void {
    const { bucket, prefix } = S3Service.extractBucketAndPrefix(path);
    const params = {
      Bucket: bucket,
      Delimiter: config.s3Delimiter,
      MaxKeys: config.s3MaxKeys,
      Prefix: prefix
    };
    this.s3.listObjectsV2(params, (err, data: S3.ListObjectsV2Output) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString()}));
      else cb(data.Name, data.CommonPrefixes, data.Contents);
    });
  }

  /** Load file metadata */
  loadFileMetadata(path: string,
                   cb: (metadata: FileMetadata) => void): void {
    const { bucket, prefix, version } = S3Service.extractBucketAndPrefix(path);
    const params = {
      Bucket: bucket,
      Key: prefix,
      VersionId: version
    };
    const funcs = {
      acl: async.apply(this.s3.getObjectAcl, params),
      head: async.apply(this.s3.headObject, params),
      tagging: async.apply(this.s3.getObjectTagging, params)
    };
    async.parallelLimit(async.reflectAll(funcs), 1, (err, results: any) => {
      // NOTE: we are ignoring errors and only recording metadata actually found
      // reason: a file with no tags for example errors on the tagging call
      const metadata = Object.keys(funcs).reduce((acc, key) => {
        acc[key] = results[key].value || { };
        return acc;
      }, { } as FileMetadata);
      cb(metadata);
    });
  }

  /** Load the versions of a file */
  loadFileVersions(path: string,
                   cb: (versions: S3.ObjectVersionList) => void): void {
    const { bucket, prefix } = S3Service.extractBucketAndPrefix(path);
    const params = {
      Bucket: bucket,
      Prefix: prefix
    };
    this.s3.listObjectVersions(params, (err, data: S3.ListObjectVersionsOutput) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else cb(data.Versions);
    });
  }

  /** Update bucket metadata */
  updateBucketMetadata(path: string,
                       metadata: BucketMetadata,
                       cb: () => void): void {
    const { bucket } = S3Service.extractBucketAndPrefix(path);
    const common = { Bucket: bucket };
    const params = {
      versioning: { VersioningConfiguration: { Status: metadata.versioning.Status || 'Suspended' } }
    };
    const funcs = [
      async.apply(this.s3.putBucketVersioning, { ...common, ...params.versioning })
    ];
    async.parallelLimit(funcs, 1, (err, results: any) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else cb();
    });
  }

}
