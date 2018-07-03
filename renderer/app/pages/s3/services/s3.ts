import * as S3 from 'aws-sdk/clients/s3';

import { BucketMetadata } from '../state/s3meta';
import { ElectronService } from 'ngx-electron';
import { FileMetadata } from '../state/s3meta';
import { Injectable } from '@angular/core';
import { Message } from '../../../state/status';
import { Observable } from 'rxjs';
import { PathService } from '../services/path';
import { PrefsState } from '../../../state/prefs';
import { PrefsStateModel } from '../../../state/prefs';
import { Select } from '@ngxs/store';
import { Store } from '@ngxs/store';
import { WatcherService } from './watcher';

import { config } from '../../../config';
import { isObjectEmpty } from 'ellib';
import { nullSafe } from 'ellib';

import async from 'async-es';

/**
 * S3 service
 */

@Injectable()
export class S3Service {

  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;

  private s3: S3;

  private s3_: typeof S3;

  /** ctor */
  constructor(private electron: ElectronService,
              private path: PathService,
              private store: Store,
              private watcher: WatcherService) {
    this.s3_ = this.electron.remote.require('aws-sdk/clients/s3');
    this.prefs$.subscribe((prefs: PrefsStateModel) => {
      this.s3 = new this.s3_({ 
        endpoint: prefs.endpoints.s3,
        s3ForcePathStyle: true
      });
    });
  }

  /** Load bucket metadata */
  loadBucketMetadata(path: string,
                     cb: (metadata: BucketMetadata) => void): void {
    const { bucket } = this.path.analyze(path);
    const params = { Bucket: bucket };
    const funcs = async.reflectAll({
      accelerate: async.apply(this.s3.getBucketAccelerateConfiguration, params),
      acl: async.apply(this.s3.getBucketAcl, params),
      encryption: async.apply(this.s3.getBucketEncryption, params),
      logging: async.apply(this.s3.getBucketLogging, params),
      tagging: async.apply(this.s3.getBucketTagging, params),
      versioning: async.apply(this.s3.getBucketVersioning, params),
      website: async.apply(this.s3.getBucketWebsite, params)
    });
    // now load them all in parallel
    async.parallelLimit(funcs, config.numParallel, (err, results: any) => {
      // NOTE: we are ignoring errors and only recording metadata actually found
      // reason: a bucket with no tags for example errors on the tagging call
      // TODO: while developing, log this nicely
      console.group(`%cloadBucketMetadata('${bucket}')`, `color: #004d40`);
      const metadata = Object.keys(funcs).reduce((acc, key) => {
        acc[key] = results[key].value || { };
        console.log(`%c${key} %c${JSON.stringify(acc[key])}`, 'color: black', 'color: grey');
        return acc;
      }, { } as BucketMetadata);
      console.groupEnd();
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
        const funcs = data.Buckets.map(bucket => {
          const params = { Bucket: bucket.Name };
          return async.apply(this.s3.getBucketLocation, params);
        });
        // now run them all in parrallel
        async.parallelLimit(funcs, config.numParallel, (err, results: S3.GetBucketLocationOutput[]) => {
          if (err)
            this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
          else {
            const locations: string[] = results.map(result => {
              // an empty string means us-east-1
              // @see https://docs.aws.amazon.com/AmazonS3/
              //       latest/API/RESTBucketGETlocation.html
              return result.LocationConstraint || 'us-east-1';
            });
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
                     contents: S3.ObjectList,
                     versioning: boolean) => void): void {
    const { bucket, prefix } = this.path.analyze(path);
    const funcs = {
      objects: async.apply(this.s3.listObjectsV2, {
        Bucket: bucket,
        Delimiter: config.s3Delimiter,
        MaxKeys: config.s3MaxKeys,
        Prefix: prefix
      }),
      versioning: async.apply(this.s3.getBucketVersioning, { Bucket: bucket })
    };
    // now load them all in parallel
    async.parallelLimit(funcs, config.numParallel, (err, results: any) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else {
        const versioning: S3.GetBucketVersioningOutput = results.versioning;
        const data: S3.ListObjectsV2Output = results.objects;
        // NOTE: versioning once set can never be turned off
        cb(data.Name, data.CommonPrefixes, data.Contents, !!versioning.Status);
      }
    });
  }

  /** Load file metadata */
  loadFileMetadata(path: string,
                   cb: (metadata: FileMetadata) => void): void {
    const { bucket, prefix, version } = this.path.analyze(path);
    const params = {
      Bucket: bucket,
      Key: prefix,
      VersionId: version
    };
    const funcs = async.reflectAll({
      acl: async.apply(this.s3.getObjectAcl, params),
      head: async.apply(this.s3.headObject, params),
      tagging: async.apply(this.s3.getObjectTagging, params)
    });
    // now load them all in parallel
    async.parallelLimit(funcs, config.numParallel, (err, results: any) => {
      // NOTE: we are ignoring errors and only recording metadata actually found
      // reason: a file with no tags for example errors on the tagging call
      // TODO: while developing, log this nicely
      console.group(`%cloadFileMetadata('${path}')`, `color: #006064`);
      const metadata = Object.keys(funcs).reduce((acc, key) => {
        acc[key] = results[key].value || { };
        console.log(`%c${key} %c${JSON.stringify(acc[key])}`, 'color: black', 'color: grey');
        return acc;
      }, { } as FileMetadata);
      // NOTE: headObject produces a conglomerate of data we need to separate
      metadata.storage = metadata.head.StorageClass;
      console.groupEnd();
      cb(metadata);
    });
  }

  /** Load the versions of a file */
  loadFileVersions(path: string,
                   cb: (versions: S3.ObjectVersionList) => void): void {
    const { bucket, prefix } = this.path.analyze(path);
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
                       cb?: () => void): void {
    const { bucket } = this.path.analyze(path);
    const params = { Bucket: bucket };
    const funcs = [];

    // Acceleration -- Note: can't turn off and Status must be present
    if (metadata.accelerate.Status)
      funcs.push(async.apply(this.s3.putBucketAccelerateConfiguration, { ...params, AccelerateConfiguration:  metadata.accelerate }));

    // ENCRYPTION -- Note: if no algorithm, need to explcitly delete
    const encAlgorithm = nullSafe(metadata.encryption, 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm');
    if (encAlgorithm)
      funcs.push(async.apply(this.s3.putBucketEncryption, { ...params, ...metadata.encryption }));
    else funcs.push(async.apply(this.s3.deleteBucketEncryption, params));

    // LOGGING -- Note: if no bucket etc, set to empty to disable logging
    const logBucket = metadata.logging.LoggingEnabled.TargetBucket;
    funcs.push(async.apply(this.s3.putBucketLogging, { ...params, BucketLoggingStatus: logBucket? metadata.logging : { } }));

    // TAGGING -- Note: must have a TagSet, even if empty
    if (metadata.tagging.TagSet && !isObjectEmpty(metadata.tagging.TagSet))
      funcs.push(async.apply(this.s3.putBucketTagging, { ...params, Tagging: metadata.tagging }));
    else funcs.push(async.apply(this.s3.deleteBucketTagging, params));

    // VERSIONING -- Note: can't turn off and Status must be present
    if (metadata.versioning.Status)
      funcs.push(async.apply(this.s3.putBucketVersioning, { ...params, VersioningConfiguration: metadata.versioning }));

    // WEBSITE
    if (metadata.website.RedirectAllRequestsTo.HostName)
      funcs.push(async.apply(this.s3.putBucketWebsite, { ...params, WebsiteConfiguration: { RedirectAllRequestsTo: metadata.website.RedirectAllRequestsTo } }));
    else if (metadata.website.IndexDocument.Suffix)
      funcs.push(async.apply(this.s3.putBucketWebsite, { ...params, WebsiteConfiguration: { IndexDocument: metadata.website.IndexDocument, ErrorDocument: metadata.website.ErrorDocument } }));
    else funcs.push(async.apply(this.s3.deleteBucketWebsite, params));

    // now update them all in parallel
    async.parallelLimit(funcs, config.numParallel, (err, results: any) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else {
        // TODO: while developing, log this nicely
        console.group(`%cupdateBucketMetadata('${bucket}')`, `color: #0d47a1`);
        Object.keys(metadata).forEach(key => {
          console.log(`%c${key} %c${JSON.stringify(metadata[key])}`, 'color: black', 'color: grey');
        });
        console.groupEnd();
        // TODO: we'd like the watcher to see this automagically
        this.watcher.touch(path);
        if (cb)
          cb();
      }
    });
  }

  /** Update file metadata */
  updateFileMetadata(path: string,
                     metadata: FileMetadata,
                     cb?: () => void): void {
    const { bucket, prefix, version } = this.path.analyze(path);
    const params = { Bucket: bucket, Key: prefix };
    const funcs = [];

    // TAGGING -- Note: must have a TagSet, even if empty
    if (metadata.tagging.TagSet && !isObjectEmpty(metadata.tagging.TagSet))
      funcs.push(async.apply(this.s3.putObjectTagging, { ...params, Tagging: metadata.tagging }));
    else funcs.push(async.apply(this.s3.deleteObjectTagging, params));

    // EVERYTHING ELSE

    // NOTE: must copy object to take effect
    // NOTE: we can only do this for the latest version
    if (!version) {
      const copy = {
        // @see https://github.com/aws/aws-sdk-js/issues/1821
        CopySource: encodeURIComponent(path),
        StorageClass: metadata.storage
      };
      funcs.push(async.apply(this.s3.copyObject, { ...params, ...copy }));
    }

    // now update them all in parallel
    async.parallelLimit(funcs, config.numParallel, (err, results: any) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else {
        // TODO: while developing, log this nicely
        console.group(`%cupdateFileMetadata('${bucket}')`, `color: #1b5e20`);
        Object.keys(metadata).forEach(key => {
          console.log(`%c${key} %c${JSON.stringify(metadata[key])}`, 'color: black', 'color: grey');
        });
        console.groupEnd();
        // TODO: we'd like the watcher to see this automagically
        this.watcher.touch(path);
        if (cb)
          cb();
      }
    });
  }

}
