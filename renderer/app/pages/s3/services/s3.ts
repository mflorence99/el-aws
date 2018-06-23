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
 * S3 service
 */

@Injectable()
export class S3Service {

  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;

  private s3: S3;

  private s3_: typeof S3;

  /** ctor */
  constructor(private electron: ElectronService,
              private store: Store) {
    this.s3_ = this.electron.remote.require('aws-sdk/clients/s3');
    this.prefs$.subscribe((prefs: PrefsStateModel) => {
      this.s3 = new this.s3_({ endpoint: prefs.endpoints.s3 });
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
    const { bucket, prefix } = this.extractBucketAndPrefix(path);
    const params = {
      Bucket: bucket,
      Delimiter: config.s3Delimiter,
      MaxKeys: config.s3MaxKeys,
      Prefix: prefix
    };
    this.s3.listObjectsV2(params, (err, data: S3.ListObjectsV2Output) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString()}));
      else {
        // log directory load nicely because we refer to it all the time
        console.group(`%cloadDirectory %c${bucket}%c${config.s3Delimiter}${prefix}`, 'color: #3367d6', 'color: black', 'color: grey');
          console.table({
            IsTruncated: data.IsTruncated,
            Name: data.Name,
            MaxKeys: data.MaxKeys,
            CommonPrefixes: data.CommonPrefixes.map(pfx => pfx.Prefix).join(),
            EncodingType: data.EncodingType,
            KeyCount: data.KeyCount,
            NextContinuationToken: data.NextContinuationToken,
            StartAfter: data.StartAfter
          });
        console.groupEnd();
        cb(data.Name, data.CommonPrefixes, data.Contents);
      }
    });
  }

  // private methods

  private extractBucketAndPrefix(path: string): { bucket, prefix} {
    // @see https://stackoverflow.com/questions/30726079/aws-s3-object-listing
    let bucket, prefix;
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
    return { bucket, prefix };
  }

}
