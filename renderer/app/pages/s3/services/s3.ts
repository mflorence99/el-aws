import * as S3 from 'aws-sdk/clients/s3';

import { BucketMetadata } from '../state/s3meta';
import { BucketMetadataAcceleration } from '../state/s3meta';
import { BucketMetadataLogging } from '../state/s3meta';
import { BucketMetadataTagging } from '../state/s3meta';
import { BucketMetadataVersioning } from '../state/s3meta';
import { BucketMetadataWebsite } from '../state/s3meta';
import { ElectronService } from 'ngx-electron';
import { FileMetadata } from '../state/s3meta';
import { FileMetadataHead } from '../state/s3meta';
import { FileMetadataTagging } from '../state/s3meta';
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
      acceleration: async.apply(this.getBucketAcceleration.bind(this), params),
      acl: async.apply(this.s3.getBucketAcl, params),
      encryption: async.apply(this.s3.getBucketEncryption, params),
      logging: async.apply(this.getBucketLogging.bind(this), params),
      tagging: async.apply(this.getBucketTagging.bind(this), params),
      versioning: async.apply(this.getBucketVersioning.bind(this), params),
      website: async.apply(this.getBucketWebsite.bind(this), params)
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
        // now run them all in parallel
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
      head: async.apply(this.getObjectHead.bind(this), params),
      tagging: async.apply(this.getObjectTagging.bind(this), params)
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
      }, { path } as FileMetadata);
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
    const funcs = [
      async.apply(this.putBucketAcceleration.bind(this), params, metadata.acceleration),
      async.apply(this.putBucketLogging.bind(this), params, metadata.logging),
      async.apply(this.putBucketTagging.bind(this), params, metadata.tagging),
      async.apply(this.putBucketVersioning.bind(this), params, metadata.versioning),
      async.apply(this.putBucketWebsite.bind(this), params, metadata.website)
    ];
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
        if (cb) cb();
      }
    });
  }

  /** Update file metadata */
  updateFileMetadata(path: string,
                     metadata: FileMetadata,
                     cb?: () => void): void {
    const { bucket, prefix, version } = this.path.analyze(path);
    const params = { 
      Bucket: bucket, 
      Key: prefix,
      VersionId: version
    };
    const funcs = [
      async.apply(this.putObjectHead.bind(this), params, path, metadata.head),
      async.apply(this.putObjectTagging.bind(this), params, metadata.tagging)
    ];
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
        if (cb) cb();
      }
    });
  }

  // NOTE: these methods are adaptors that wrap the S3 metadata to assist the UI

  private getBucketAcceleration(params: any,
                                cb: (err, data: BucketMetadataAcceleration) => void) {
    this.s3.getBucketAccelerateConfiguration(params, (err, data: S3.GetBucketAccelerateConfigurationOutput) => {
      cb(null, {
        Status: nullSafe(data, 'Status')
      });
    });
  }

  private getBucketLogging(params: any,
                           cb: (err, data: BucketMetadataLogging) => void) {
    this.s3.getBucketLogging(params, (err, data: S3.GetBucketLoggingOutput) => {
      cb(null, {
        LoggingEnabled: nullSafe(data, 'LoggingEnabled')? 'On' : 'Off',
        TargetBucket: nullSafe(data, 'LoggingEnabled.TargetBucket'),
        TargetPrefix: nullSafe(data, 'LoggingEnabled.TargetPrefix')
      });
    });
  }

  private getBucketTagging(params: any,
                           cb: (err, data: BucketMetadataTagging) => void) {
    this.s3.getBucketTagging(params, (err, data: S3.GetBucketTaggingOutput) => {
      cb(null, {
        TagSet: data? data.TagSet : []
      });
    });
  }

  private getBucketVersioning(params: any,
                              cb: (err, data: BucketMetadataVersioning) => void) {
    this.s3.getBucketVersioning(params, (err, data: S3.GetBucketVersioningOutput) => {
      cb(null, {
        Status: nullSafe(data, 'Status')
      });
    });
  }

  private getBucketWebsite(params: any,
                          cb: (err, data: BucketMetadataWebsite) => void) {
    this.s3.getBucketWebsite(params, (err, data: S3.GetBucketWebsiteOutput) => {
      cb(null, {
        ErrorDocument: nullSafe(data, 'ErrorDocument.Key'),
        IndexDocument: nullSafe(data, 'IndexDocument.Suffix'),
        RedirectHostName: nullSafe(data, 'RedirectAllRequestsTo.HostName'),
        RedirectProtocol: nullSafe(data, 'RedirectAllRequestsTo.Protocol'),
        WebsiteEnabled: nullSafe(data, 'RedirectAllRequestsTo') ? 'Redirect' : (nullSafe(data, 'IndexDocument')? 'On' : 'Off')
      });
    });
  }

  private getObjectHead(params: any, 
                        cb: (err, data: FileMetadataHead) => void) {
    this.s3.headObject(params, (err, data: S3.HeadObjectOutput) => {
      cb(null, {
        encryption: { 
          SSEAlgorithm: nullSafe(data, 'ServerSideEncryption'),
          KMSMasterKeyID: nullSafe(data, 'SSEKMSKeyId')
        },
        storage: { 
          StorageClass: nullSafe(data, 'StorageClass')
        }
      });
    });
  }

  private getObjectTagging(params: any,
                           cb: (err, data: FileMetadataTagging) => void) {
    this.s3.getObjectTagging(params, (err, data: S3.GetObjectTaggingOutput) => {
      cb(null, {
        TagSet: data? data.TagSet : []
      });
    });
  }

  private putBucketAcceleration(params: any,
                                acceleration: BucketMetadataAcceleration,
                                cb: (err, data) => void): void {
    if (acceleration.Status)
      this.s3.putBucketAccelerateConfiguration({ ...params, AccelerateConfiguration: acceleration }, cb);
    else cb(null, null);
  }

  private putBucketLogging(params: any,
                           logging: BucketMetadataLogging,
                           cb: (err, data) => void): void {
    const status = { BucketLoggingStatus: { } };
    if (logging.LoggingEnabled === 'On') {
      status.BucketLoggingStatus = {
        LoggingEnabled: {
          TargetBucket: logging.TargetBucket,
          TargetPrefix: logging.TargetPrefix
        }
      };
    }
    this.s3.putBucketLogging({ ...params, ...status }, cb);
  }

  private putBucketTagging(params: any,
                           tagging: BucketMetadataTagging,
                           cb: (err, data) => void): void {
    let func;
    if (tagging.TagSet && (tagging.TagSet.length > 0))
      func = this.s3.putBucketTagging.bind(null, { ...params, Tagging: tagging });
    else func = this.s3.deleteBucketTagging.bind(null, params);
    func(cb);
  }

  private putBucketVersioning(params: any,
                              versioning: BucketMetadataVersioning,
                              cb: (err, data) => void): void {
    if (versioning.Status)
      this.s3.putBucketVersioning({ ...params, VersioningConfiguration: versioning }, cb);
    else cb(null, null);
  }

  private putBucketWebsite(params: any,
                           website: BucketMetadataWebsite,
                           cb: (err, data) => void): void {
    if (website.WebsiteEnabled === 'Off')
      this.s3.deleteBucketWebsite(params, cb);
    else {
      const config = { WebsiteConfiguration: { } };
      if (website.WebsiteEnabled === 'On') {
        config.WebsiteConfiguration = {
          ErrorDocument: { Key: website.ErrorDocument },
          IndexDocument: { Suffix: website.IndexDocument }
        };
      }
      else if (website.WebsiteEnabled === 'Redirect') {
        config.WebsiteConfiguration = {
          RedirectAllRewquestsTo: {
            HostName: website.RedirectHostName,
            Protocol: website.RedirectProtocol
          }
        };
      }
      this.s3.putBucketWebsite({ ...params, ...config }, cb);
    }
  }

  private putObjectHead(params: any,
                        path: string,
                        head: FileMetadataHead,
                        cb: (err, data) => void): void {
    const copy: any = {
      Bucket: params.Bucket,
      // @see https://github.com/aws/aws-sdk-js/issues/1821
      CopySource: encodeURIComponent(path),
      Key: params.Key
    };
    // encryption changes
    let changed = false;
    if (head.encryption.SSEAlgorithm) {
      changed = true;
      copy.ServerSideEncryption = head.encryption.SSEAlgorithm;
      if (copy.ServerSideEncryption === 'aws:kms')
        copy.SSEKMSKeyId = head.encryption.KMSMasterKeyID;
    }
    // storage changes
    if (head.storage.StorageClass) {
      changed = true;
      copy.StorageClass = head.storage.StorageClass;
    }
    // copy object if changed
    if (changed)
      this.s3.copyObject(copy, cb);
    else cb(null, null);
  }

  private putObjectTagging(params: any,
                           tagging: FileMetadataTagging,
                           cb: (err, data) => void): void {
    let func;
    if (tagging.TagSet && (tagging.TagSet.length > 0))
      func = this.s3.putObjectTagging.bind(null, { ...params, Tagging: tagging });
    else func = this.s3.deleteObjectTagging.bind(null, params);
    func(cb);
  }

}
