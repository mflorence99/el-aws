import * as S3 from 'aws-sdk/clients/s3';

import { BucketMetadata } from '../state/s3meta';
import { BucketMetadataAcceleration } from '../state/s3meta';
import { BucketMetadataAcl } from '../state/s3meta';
import { BucketMetadataAclGrant } from '../state/s3meta';
import { BucketMetadataEncryption } from '../state/s3meta';
import { BucketMetadataLogging } from '../state/s3meta';
import { BucketMetadataTagging } from '../state/s3meta';
import { BucketMetadataVersioning } from '../state/s3meta';
import { BucketMetadataWebsite } from '../state/s3meta';
import { CreateBucketRequest } from '../state/s3';
import { ElectronService } from 'ngx-electron';
import { FeatureState } from '../state/feature';
import { FileMetadata } from '../state/s3meta';
import { FileMetadataAcl } from '../state/s3meta';
import { FileMetadataAclGrant } from '../state/s3meta';
import { FileMetadataHead } from '../state/s3meta';
import { FileMetadataTagging } from '../state/s3meta';
import { Injectable } from '@angular/core';
import { Message } from '../../../state/status';
import { Observable } from 'rxjs';
import { PathInfo } from '../services/path';
import { PathService } from '../services/path';
import { PeriodResolverService } from '../../../services/period-resolver';
import { PrefsState } from '../../../state/prefs';
import { PrefsStateModel } from '../../../state/prefs';
import { S3FilterState } from '../state/s3filter';
import { S3FilterStateModel } from '../state/s3filter';
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

  private minimatch;
  private s3: S3;
  private upload: S3.ManagedUpload;

  private s3_: typeof S3;

  /** ctor */
  constructor(private electron: ElectronService,
              private path: PathService,
              private periodResolver: PeriodResolverService,
              private store: Store,
              private watcher: WatcherService) {
    this.minimatch = this.electron.remote.require('minimatch');
    this.s3_ = this.electron.remote.require('aws-sdk/clients/s3');
    this.prefs$.subscribe((prefs: PrefsStateModel) => {
      this.s3 = new this.s3_({ 
        endpoint: prefs.endpoints.s3,
        maxRetries: config.s3.maxRetries,
        region: prefs.region,
        s3ForcePathStyle: true
      });
    });
  }

  /** Cancel any running upload */
  cancelUpload(): void {
    if (this.upload) {
      this.upload.abort();
      this.upload = null;
    }
  }

  /** Clean out a bucket NOTE: test mode */
  async cleanBucket(Bucket: string,
                    filter?: string) {
    while (true) {
      const data = await this.s3.listObjectsV2({ Bucket, MaxKeys: 1000 }).promise();
      if (data.Contents.length === 0)
        break;
      const params = data.Contents
        .filter(Content => !filter || Content.Key.startsWith(filter))
        .reduce((acc, Content) => {
          this.cleanObjectVersions(Bucket, Content.Key);
          acc.Delete.Objects.push({ Key: Content.Key });
          return acc;
        }, { Bucket, Delete: { Objects: [] }});
      if (params.Delete.Objects.length) {
        console.log(`Deleting ${params.Delete.Objects.length} objects from ${Bucket}`);
        await this.s3.deleteObjects(params).promise();
      }
    }
  }

  async cleanObjectVersions(Bucket: string, 
                            Prefix: string) {
    const params: S3.ListObjectVersionsRequest = { Bucket, Prefix };
    const data = await this.s3.listObjectVersions(params).promise();
    if (data.Versions.length > 0) {
      const params = data.Versions
        .filter(Version => Version.VersionId && (Version.VersionId !== 'null'))
        .reduce((acc, Version) => {
          acc.Delete.Objects.push({ Key: Version.Key, VersionId: Version.VersionId });
          return acc;
        }, { Bucket, Delete: { Objects: [] } });
      if (params.Delete.Objects.length) {
        console.log(`Deleting ${params.Delete.Objects.length} versions from ${Bucket}`);
        await this.s3.deleteObjects(params).promise();
      }
    }
  }

  /** Create a new bucket */
  createBucket(request: CreateBucketRequest,
               cb?: () => void): void {
    const params: S3.CreateBucketRequest = {
      ACL: request.ACL,
      Bucket: request.Bucket
    };
    // NOTE: us-east-1 must be coded as null for historical reasons
    if (request.Region !== 'us-east-1') {
      params.CreateBucketConfiguration = {
        LocationConstraint: request.Region
      };
    }
    // now create bucket
    this.s3.createBucket(params, (err, data: S3.CreateBucketOutput) => {
      this.trace('createBucket', params, err, data);
      // TODO: we'd like the watcher to see this automagically
      this.watcher.touch(config.s3.delimiter);
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else if (cb)
        cb();
    });
  }

  /** Create a new directory */
  createDirectory(path: string,
                  cb?: () => void): void {
    const { bucket, prefix, parent } = this.path.analyze(path);
    const params: S3.PutObjectRequest = { 
      Body: '',
      Bucket: bucket,
      Key: prefix 
    };
    // now create empty object as directory
    this.s3.putObject(params, (err, data: S3.PutObjectOutput) => {
      this.trace('createDirectory', params, err, data);
      // TODO: we'd like the watcher to see this automagically
      this.watcher.touch(parent);
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else if (cb)
        cb();
    });
  }

  /** Delete a bucket (which must be empty!) */
  deleteBucket(path: string,
               cb?: () => void): void {
    const { bucket } = this.path.analyze(path);
    const params: S3.DeleteBucketRequest = { Bucket: bucket };
    // now delete bucket
    this.s3.deleteBucket(params, (err, data: { }) => {
      this.trace('deleteBucket', params, err, data);
      // TODO: we'd like the watcher to see this automagically
      this.watcher.touch(config.s3.delimiter);
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else if (cb)
        cb();
    });
  }

  /** Delete a set of objects */
  deleteObjects(paths: string[],
                cb?: () => void): void {
    const funcs = paths
      .map(path => this.path.analyze(path))
      .filter((info: PathInfo) => info.isFile)
      .map((info: PathInfo) => {
        return {
          Bucket: info.bucket,
          Key: info.prefix,
          VersionId: info.version
        } as S3.DeleteObjectRequest;
      })
      .reduce((acc, params) => {
        acc.push(async.apply(this.s3.deleteObject, params));
        return acc;
      }, []);
    // now delete them all in parallel
    async.parallelLimit(funcs, config.numParallelOps, (err, data: S3.DeleteObjectOutput) => {
      this.trace('deleteObjects', paths, err, data);
      // TODO: we'd like the watcher to see this automagically
      paths.forEach(path => {
        const { parent } = this.path.analyze(path);
        this.watcher.touch(parent);
      });
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else if (cb)
        cb();
    });
  }

  /** Extend the contents of a "directory" */
  extendDirectory(path: string,
                  token: string,
                  versioning: boolean,
                  extensionNum: number,
                  cb: (bucket: S3.BucketName,
                       prefixes: S3.CommonPrefixList,
                       contents: S3.ObjectList,
                       truncated: S3.IsTruncated,
                       token: S3.Token,
                       versioning: boolean,
                       extensionNum: number) => void): void {
    const { bucket, prefix } = this.path.analyze(path);
    const params: S3.ListObjectsV2Request = {
      Bucket: bucket,
      ContinuationToken: token,
      Delimiter: config.s3.delimiter,
      FetchOwner: true,
      MaxKeys: config.s3.maxKeys,
      Prefix: prefix
    };
    this.s3.listObjectsV2(params, (err, data: S3.ListObjectsV2Output) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else cb(data.Name, data.CommonPrefixes, this.filter(bucket, data.Contents), data.IsTruncated, data.NextContinuationToken, versioning, extensionNum + 1);
    });
  }

  /** Make a signed URL for object retrieval */
  getSignedURL(path: string,
               cb: (url: string) => void): void {
    const { bucket, prefix } = this.path.analyze(path);
    const params = {
      Bucket: bucket,
      Expires: config.s3.signedURLExpiry / 1000,
      Key: prefix
    };
    this.s3.getSignedUrl('getObject', params, (err, url: string) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else cb(url);    
    });
  }

  /** Load bucket metadata */
  loadBucketMetadata(path: string,
                     cb: (metadata: BucketMetadata) => void): void {
    const { bucket } = this.path.analyze(path);
    const params = { Bucket: bucket };
    const funcs = async.reflectAll({
      acceleration: async.apply(this.getBucketAcceleration.bind(this), params),
      acl: async.apply(this.getBucketAcl.bind(this), params),
      encryption: async.apply(this.getBucketEncryption.bind(this), params),
      logging: async.apply(this.getBucketLogging.bind(this), params),
      tagging: async.apply(this.getBucketTagging.bind(this), params),
      versioning: async.apply(this.getBucketVersioning.bind(this), params),
      website: async.apply(this.getBucketWebsite.bind(this), params)
    });
    // now load them all in parallel
    async.parallelLimit(funcs, config.numParallelOps, (err, data: { value }) => {
      // NOTE: we are ignoring errors and only recording metadata actually found
      // reason: a bucket with no tags for example errors on the tagging call
      // TODO: while developing, log this nicely
      console.group(`%cloadBucketMetadata('${bucket}')`, `color: #004d40`);
      const metadata = Object.keys(funcs).reduce((acc, key) => {
        acc[key] = data[key].value || { };
        console.log(`%c${key} %c${JSON.stringify(acc[key])}`, 'color: black', 'color: grey');
        return acc;
      }, { path } as BucketMetadata);
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
          const params: S3.GetBucketLocationRequest = { Bucket: bucket.Name };
          return async.apply(this.s3.getBucketLocation, params);
        });
        // now run them all in parallel
        async.parallelLimit(funcs, config.numParallelOps, (err, results: S3.GetBucketLocationOutput[]) => {
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
                cb: (bucket: S3.BucketName,
                     prefixes: S3.CommonPrefixList,
                     contents: S3.ObjectList,
                     truncated: S3.IsTruncated,
                     token: S3.Token, 
                     versioning: boolean) => void): void {
    const { bucket, prefix } = this.path.analyze(path);
    const funcs = {
      objects: async.apply(this.s3.listObjectsV2, {
        Bucket: bucket,
        Delimiter: config.s3.delimiter,
        FetchOwner: true,
        MaxKeys: config.s3.maxKeys,
        Prefix: prefix
      } as S3.ListObjectsV2Request),
      versioning: async.apply(this.s3.getBucketVersioning, { Bucket: bucket })
    };
    // now load them all in parallel
    async.parallelLimit(funcs, config.numParallelOps, (err, results: any) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else {
        const versioning: S3.GetBucketVersioningOutput = results.versioning;
        const data: S3.ListObjectsV2Output = results.objects;
        // NOTE: versioning once set can never be turned off
        cb(data.Name, data.CommonPrefixes, this.filter(bucket, data.Contents), data.IsTruncated, data.NextContinuationToken, !!versioning.Status);
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
      acl: async.apply(this.getObjectAcl.bind(this), params),
      head: async.apply(this.getObjectHead.bind(this), params),
      tagging: async.apply(this.getObjectTagging.bind(this), params)
    });
    // now load them all in parallel
    async.parallelLimit(funcs, config.numParallelOps, (err, data: { value }) => {
      // NOTE: we are ignoring errors and only recording metadata actually found
      // reason: a file with no tags for example errors on the tagging call
      // TODO: while developing, log this nicely
      console.group(`%cloadFileMetadata('${path}')`, `color: #006064`);
      const metadata = Object.keys(funcs).reduce((acc, key) => {
        acc[key] = data[key].value || { };
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
    const params: S3.ListObjectVersionsRequest = {
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
      async.apply(this.putBucketAcl.bind(this), params, metadata.acl),
      async.apply(this.putBucketEncryption.bind(this), params, metadata.encryption),
      async.apply(this.putBucketLogging.bind(this), params, metadata.logging),
      async.apply(this.putBucketTagging.bind(this), params, metadata.tagging),
      async.apply(this.putBucketVersioning.bind(this), params, metadata.versioning),
      async.apply(this.putBucketWebsite.bind(this), params, metadata.website)
    ];
    // now update them all in parallel
    async.parallelLimit(funcs, config.numParallelOps, (err, results: any) => {
      // TODO: we'd like the watcher to see this automagically
      this.watcher.touch(path);
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else {
        // TODO: while developing, log this nicely
        console.group(`%cupdateBucketMetadata('${bucket}')`, `color: #0d47a1`);
        Object.keys(metadata).forEach(key => {
          console.log(`%c${key} %c${JSON.stringify(metadata[key])}`, 'color: black', 'color: grey');
        });
        console.groupEnd();
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
      async.apply(this.putObjectAcl.bind(this), params, metadata.acl),
      async.apply(this.putObjectHead.bind(this), params, path, metadata.head),
      async.apply(this.putObjectTagging.bind(this), params, metadata.tagging)
    ];
    // now update them all in parallel
    async.parallelLimit(funcs, config.numParallelOps, (err, results: any) => {
      // TODO: we'd like the watcher to see this automagically
      this.watcher.touch(path);
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else {
        // TODO: while developing, log this nicely
        console.group(`%cupdateFileMetadata('${bucket}')`, `color: #1b5e20`);
        Object.keys(metadata).forEach(key => {
          console.log(`%c${key} %c${JSON.stringify(metadata[key])}`, 'color: black', 'color: grey');
        });
        console.groupEnd();
        if (cb) cb();
      }
    });
  }

  /** Create a new directory */
  uploadObject(path: string,
               stream: any,
               progress?: (percent: number) => void,
               cb?: () => void): void {
    const { bucket, prefix, parent } = this.path.analyze(path);
    const params = {
      Body: stream,
      Bucket: bucket,
      Key: prefix,
    };
    // now start upload
    this.upload = this.s3.upload(params, (err, data) =>  {
      this.upload = null;
      // TODO: we'd like the watcher to see this automagically
      this.watcher.touch(parent);
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString() }));
      else if (cb) 
        cb();
    });
    // deliver progress notifications
    if (progress && this.upload) {
      this.upload.on('httpUploadProgress', payload => {
        const { loaded, total } = payload;
        progress(Math.round((loaded / total) * 100));
      });
    }
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

  private getBucketAcl(params: any,
                       cb: (err, data: BucketMetadataAcl) => void) {
    this.s3.getBucketAcl(params, (err, data: S3.GetBucketAclOutput) => {
      const acl: BucketMetadataAcl = {
        Grants: [
          { Grantee: 'Private access', ReadAcl: false, ReadObjects: false, WriteAcl: false, WriteObjects: false },
          { Grantee: 'Public access', ReadAcl: false, ReadObjects: false, WriteAcl: false, WriteObjects: false },
          { Grantee: 'S3 log delivery', ReadAcl: false, ReadObjects: false, WriteAcl: false, WriteObjects: false }
        ], 
        Owner: null,
        Summary: 'Private'
      };
      if (data) 
        this.buildAcl(acl, data);
      cb(null, acl);
    });
  }

  private getBucketEncryption(params: any,
                              cb: (err, data: BucketMetadataEncryption) => void) {
    this.s3.getBucketEncryption(params, (err, data: S3.GetBucketEncryptionOutput) => {
      const config = nullSafe(data, 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault');
      cb(null, {
        KMSMasterKeyID: nullSafe(config, 'KMSMasterKeyID'),
        SSEAlgorithm: nullSafe(config, 'SSEAlgorithm') || 'None'
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

  private getObjectAcl(params: any,
                       cb: (err, data: FileMetadataAcl) => void) {
    this.s3.getObjectAcl(params, (err, data: S3.GetObjectAclOutput) => {
      const acl: FileMetadataAcl = {
        Grants: [
          { Grantee: 'Private access', ReadAcl: false, ReadObjects: false, WriteAcl: false, WriteObjects: false },
          { Grantee: 'Public access', ReadAcl: false, ReadObjects: false, WriteAcl: false, WriteObjects: false }
        ],
        Owner: null,
        Summary: 'Private'
      };
      if (data)
        this.buildAcl(acl, data);
      cb(null, acl);
    });
  }

  private getObjectHead(params: any, 
                        cb: (err, data: FileMetadataHead) => void) {
    this.s3.headObject(params, (err, data: S3.HeadObjectOutput) => {
      const head = {
        encryption: {
          SSEAlgorithm: nullSafe(data, 'ServerSideEncryption'),
          KMSMasterKeyID: nullSafe(data, 'SSEKMSKeyId')
        },
        metadata: {
          // TBD below
        },
        storage: {
          StorageClass: nullSafe(data, 'StorageClass')
        },
        touched: {
          encryption: false,
          metadata: false,
          storage: false
        }
      };
      // fill in only used metadata
      config.s3.metadataKeys.forEach(key => {
        const value = nullSafe(data, key);
        if (value)
          head.metadata[key] = value;
      });
      cb(null, head);
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

  // NOTE: these methods are adaptors that unwrap the UI-assist data back to real S3 

  private putBucketAcceleration(params: any,
                                acceleration: BucketMetadataAcceleration,
                                cb: (err, data) => void): void {
    if (acceleration.Status) {
      const config = { ...params, AccelerateConfiguration: acceleration };
      this.s3.putBucketAccelerateConfiguration(config, (err, data) => {
        this.trace('putBucketAccelerateConfiguration', config, err, data);
        cb(err, data);
      });
    }
    else cb(null, null);
  }

  private putBucketAcl(params: any,
                       acl: BucketMetadataAcl,
                       cb: (err, data) => void): void {
    const config = { ...params, AccessControlPolicy: { ...this.buildPolicy(acl) }};
    this.s3.putBucketAcl(config, (err, data) => {
      this.trace('putBucketAcl', config, err, data);
      cb(err, data);
    });
  }

  private putBucketEncryption(params: any,
                              encryption: BucketMetadataEncryption,
                              cb: (err, data) => void): void {
    if (encryption.SSEAlgorithm === 'None') {
      this.s3.deleteBucketEncryption(params, (err, data) => {
        this.trace('deleteBucketEncryption', params, err, data);
        cb(err, data);
      });
    }
    else {
      const config = { 
        ...params,
        ServerSideEncryptionConfiguration: {
          Rules: [{
            ApplyServerSideEncryptionByDefault: {
              SSEAlgorithm: encryption.SSEAlgorithm,
              KMSMasterKeyID: (encryption.SSEAlgorithm === 'aws:kms')? encryption.KMSMasterKeyID : null
            }
          }]
        }
      };
      this.s3.putBucketEncryption(config, (err, data) => {
        this.trace('putBucketEncryption', config, err, data);
        cb(err, data);
      });
    }
  }

  private putBucketLogging(params: any,
                           logging: BucketMetadataLogging,
                           cb: (err, data) => void): void {
    const config = {
      ...params, 
      BucketLoggingStatus: { } 
    };
    if (logging.LoggingEnabled === 'On') {
      config.BucketLoggingStatus = {
        LoggingEnabled: {
          TargetBucket: logging.TargetBucket,
          TargetPrefix: logging.TargetPrefix
        }
      };
    }
    this.s3.putBucketLogging(config, (err, data) => {
      this.trace('putBucketLogging', config, err, data);
      cb(err, data);
    });
  }

  private putBucketTagging(params: any,
                           tagging: BucketMetadataTagging,
                           cb: (err, data) => void): void {
    if (tagging.TagSet && (tagging.TagSet.length > 0)) {
      const config = { ...params, Tagging: tagging };
      this.s3.putBucketTagging(config, (err, data) => {
        this.trace('putBucketTagging', config, err, data);
        cb(err, data);
      });
    }
    else {
      this.s3.deleteBucketTagging(params, (err, data) => {
        this.trace('deleteBucketTagging', params, err, data);
        cb(err, data);
      });
    }
  }

  private putBucketVersioning(params: any,
                              versioning: BucketMetadataVersioning,
                              cb: (err, data) => void): void {
    if (versioning.Status) {
      const config = { ...params, VersioningConfiguration: versioning };
      this.s3.putBucketVersioning(config, (err, data) => {
        this.trace('putBucketVersioning', config, err, data);
        cb(err, data);
      });
    }
    else cb(null, null);
  }

  private putBucketWebsite(params: any,
                           website: BucketMetadataWebsite,
                           cb: (err, data) => void): void {
    if (website.WebsiteEnabled === 'Off') {
      this.s3.deleteBucketWebsite(params, (err, data) => {
        this.trace('deleteBucketWebsite', params, err, data);
        cb(err, data);
      });
    }
    else {
      const config = { 
        ...params,
        WebsiteConfiguration: { } 
      };
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
      this.s3.putBucketWebsite(config, (err, data) => {
        this.trace('putBucketWebsite', config, err, data);
        cb(err, data);
      });
    }
  }

  private putObjectAcl(params: any,
                       acl: FileMetadataAcl,
                       cb: (err, data) => void): void {
    const config = { ...params, AccessControlPolicy: { ...this.buildPolicy(acl) } };
    this.s3.putObjectAcl(config, (err, data) => {
      this.trace('putObjectAcl', config, err, data);
      cb(err, data);
    });
  }

  private putObjectHead(params: any,
                        path: string,
                        head: FileMetadataHead,
                        cb: (err, data) => void): void {
    if (params.VersionId)
      cb(null, null);
    else {
      const copy: any = {
        Bucket: params.Bucket,
        // @see https://github.com/aws/aws-sdk-js/issues/1821
        CopySource: encodeURIComponent(path),
        Key: params.Key
      };
      // encryption changes
      let changed = false;
      if (head.touched.encryption && head.encryption.SSEAlgorithm) {
        changed = true;
        copy.ServerSideEncryption = head.encryption.SSEAlgorithm;
        if (copy.ServerSideEncryption === 'aws:kms')
          copy.SSEKMSKeyId = head.encryption.KMSMasterKeyID;
      }
      // metadata changes
      if (head.touched.metadata) {
        Object.keys(head.metadata)
          .filter(key => !!head.metadata[key])
          .forEach(key => {
            changed = true;
            copy[key] = head.metadata[key];
            copy.MetadataDirective = 'REPLACE';
          });
      }
      // storage changes
      if (head.touched.storage && head.storage.StorageClass) {
        changed = true;
        copy.StorageClass = head.storage.StorageClass;
      }
      // copy object if changed
      if (changed) {
        this.s3.copyObject(copy, (err, data) => {
          this.trace('copyObject', copy, err, data);
          cb(err, data);
        });
      }
      else cb(null, null);
    }
  }

  private putObjectTagging(params: any,
                           tagging: FileMetadataTagging,
                           cb: (err, data) => void): void {
    if (tagging.TagSet && (tagging.TagSet.length > 0)) {
      const config = { ...params, Tagging: tagging };
      this.s3.putObjectTagging(config, (err, data) => {
        this.trace('putObjectTagging', config, err, data);
        cb(err, data);
      });
    }
    else {
      this.s3.deleteObjectTagging(params, (err, data) => {
        this.trace('deleteObjectTagging', params, err, data);
        cb(err, data);
      });
    }
  }

  // helpers

  private buildAcl(acl: BucketMetadataAcl | FileMetadataAcl,
                   data: S3.GetBucketAclOutput | S3.GetObjectAclOutput): void {
    const allUsers = 'http://acs.amazonaws.com/groups/global/AllUsers';
    const logDelivery = 'http://acs.amazonaws.com/groups/s3/LogDelivery';
    acl.Owner = data.Owner.ID;
    data.Grants.forEach((Grant: S3.Grant) => {
      let target: BucketMetadataAclGrant | FileMetadataAclGrant;
      if ((Grant.Grantee.ID === acl.Owner) && (Grant.Grantee.Type === 'CanonicalUser'))
        target = acl.Grants[0];
      else if ((Grant.Grantee.URI === allUsers) && (Grant.Grantee.Type === 'Group')) {
        acl.Summary = 'Public';
        target = acl.Grants[1];
      }
      else if ((Grant.Grantee.URI === logDelivery) && (Grant.Grantee.Type === 'Group'))
        target = acl.Grants[2];
      if (target) {
        if (Grant.Permission === 'FULL_CONTROL') {
          target.ReadAcl = true;
          target.ReadObjects = true;
          target.WriteAcl = true;
          target.WriteObjects = true;
        }
        else if (Grant.Permission === 'READ')
          target.ReadObjects = true;
        else if (Grant.Permission === 'READ_ACP')
          target.ReadAcl = true;
        else if (Grant.Permission === 'WRITE')
          target.WriteObjects = true;
        else if (Grant.Permission === 'WRITE_ACP')
          target.WriteAcl = true;
      }
    });
  }

  private buildPolicy(acl: BucketMetadataAcl | BucketMetadataAcl): S3.AccessControlPolicy {
    const policy: S3.AccessControlPolicy = {
      Grants: [] as S3.Grants,
      Owner: { ID: acl.Owner }
    };
    acl.Grants.forEach((Grant: BucketMetadataAclGrant) => {
      const model: S3.Grant = {
        Grantee: { Type: '' },
        Permission: ''
      };
      if (Grant.Grantee === 'Private access') {
        model.Grantee.ID = acl.Owner;
        model.Grantee.Type = 'CanonicalUser';
      }
      else if (Grant.Grantee === 'Public access') {
        model.Grantee.Type = 'Group';
        model.Grantee.URI = 'http://acs.amazonaws.com/groups/global/AllUsers';
      }
      else if (Grant.Grantee === 'S3 log delivery') {
        model.Grantee.Type = 'Group';
        model.Grantee.URI = 'http://acs.amazonaws.com/groups/s3/LogDelivery';
      }
      if (Grant.ReadAcl && Grant.ReadObjects && Grant.WriteAcl && Grant.WriteObjects)
        policy.Grants.push({ ...model, Permission: 'FULL_CONTROL' });
      else {
        if (Grant.ReadAcl)
          policy.Grants.push({ ...model, Permission: 'READ_ACP' });
        if (Grant.ReadObjects)
          policy.Grants.push({ ...model, Permission: 'READ' });
        if (Grant.WriteAcl)
          policy.Grants.push({ ...model, Permission: 'WRITE_ACP' });
        if (Grant.WriteObjects)
          policy.Grants.push({ ...model, Permission: 'WRITE' });
      }
    });
    return policy;
  }

  private filter(bucket: string,
                 contents: S3.ObjectList): S3.ObjectList {
    const s3filter: S3FilterStateModel = 
      this.store.selectSnapshot((state: FeatureState) => state.s3filter);
    const filter = S3FilterState.filterDefaults(s3filter[bucket]);
    return contents
      .filter(content => this.minimatch(content.Key, filter.match))
      .filter(content => this.periodResolver.isInRange(content.LastModified, filter.period));
  }

  private trace(op: string,
                params: any,
                err: any,
                data: any): void {
    console.group(`%cAWS S3 ${op} %c${JSON.stringify(params)}`, 'color: #880e4f', 'color: gray');
    if (err)
      console.log(`%cERR %c${JSON.stringify(err)}`, 'color: #c53929', 'color: gray');
    if (data)
      console.log(`%cDATA %c${JSON.stringify(data)}`, 'color: #3367d6', 'color: gray');
    console.groupEnd();
  }

}
