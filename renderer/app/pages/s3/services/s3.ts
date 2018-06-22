import * as S3 from 'aws-sdk/clients/s3';

import { ElectronService } from 'ngx-electron';
import { Injectable } from '@angular/core';
import { Message } from '../../../state/status';
import { Observable } from 'rxjs';
import { PrefsState } from '../../../state/prefs';
import { PrefsStateModel } from '../../../state/prefs';
import { Select } from '@ngxs/store';
import { Store } from '@ngxs/store';

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

  /** Load all buckets */
  loadBuckets(cb: (buckets: S3.Buckets) => void): void {
    this.s3.listBuckets((err, data: S3.ListBucketsOutput) => {
      if (err)
        this.store.dispatch(new Message({ level: 'error', text: err.toString()}));
      else cb(data.Buckets);
    });
  }

}
