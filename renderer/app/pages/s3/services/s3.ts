import * as S3 from 'aws-sdk/clients/s3';

import { ElectronService } from 'ngx-electron';
import { Injectable } from '@angular/core';

/**
 * S3 service
 */

@Injectable()
export class S3Service {

  private s3: S3;

  private s3_: typeof S3;

  /** ctor */
  constructor(private electron: ElectronService) {
    this.s3_ = this.electron.remote.require('aws-sdk/clients/s3');
    this.s3 = new this.s3_({ endpoint: 'http://s3.amazonaws.com' });
    this.s3.listBuckets((err, data) => {
      if (err)
        console.error(err);
      else {
        console.log(`Owner ${data.Owner.DisplayName} #${data.Owner.ID}`);
        data.Buckets.forEach(bucket => {
          console.log(`Bucket Name ${bucket.Name} Created ${bucket.CreationDate}`);
        });
      }
    });
  }

}
