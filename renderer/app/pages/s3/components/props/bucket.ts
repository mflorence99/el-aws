import { BucketMetadata } from '../../state/s3meta';
import { BucketMetadataFormGroup } from '../../state/s3meta';
import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { Descriptor } from '../../state/s3';
import { DrawerPanelComponent } from 'ellib';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { LoadBucketMetadata } from '../../state/s3meta';
import { OnChange } from 'ellib';
import { PrefsStateModel } from '../../../../state/prefs';
import { S3MetaStateModel } from '../../state/s3meta';
import { Store } from '@ngxs/store';

import { showHideAnimation } from 'ellib';

/**
 * Bucket props component
 */

@Component({
  animations: [showHideAnimation()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-bucket-props',
  templateUrl: 'bucket.html',
  styleUrls: ['props.scss']
})

export class BucketPropsComponent extends LifecycleComponent {

  @Input() prefs = { } as PrefsStateModel;
  @Input() s3meta = { } as S3MetaStateModel;

  desc = { } as Descriptor;
  metadata = { } as BucketMetadata;
  propsForm: FormGroup;

  encryptionEnabled: string;

  tagLabelMapping: { [k: string]: string } = { '=0': 'No tags.', '=1': 'One tag.', 'other': '# tags.' };

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
              private drawerPanel: DrawerPanelComponent,
              private formBuilder: FormBuilder,
              private store: Store) {
    super();
    // when we are opened we get a new context
    this.drawerPanel.opened.subscribe(context => {
      this.desc = <Descriptor>context;
      this.store.dispatch(new LoadBucketMetadata({ path: this.desc.path }));
      this.propsForm = this.formBuilder.group({
        acceleration: this.formBuilder.group({
          Status: ''
        }),
        acl: this.formBuilder.group({
          Grants: this.formBuilder.array([
            // NOTE: exactly 3 times
            this.formBuilder.group({ Grantee: '', ReadAcl: '', ReadObjects: '', WriteAcl: '', WriteObjects: '' }),
            this.formBuilder.group({ Grantee: '', ReadAcl: '', ReadObjects: '', WriteAcl: '', WriteObjects: '' }),
            this.formBuilder.group({ Grantee: '', ReadAcl: '', ReadObjects: '', WriteAcl: '', WriteObjects: '' })
          ]),
          Owner: ''
        }),
        encryption: this.formBuilder.group({
          SSEAlgorithm: '',
          KMSMasterKeyID: ''
        }),
        logging: this.formBuilder.group({
          LoggingEnabled: '',
          TargetBucket: '',
          TargetPrefix: ''
        }),
        path: '',
        tagging: this.formBuilder.group({
          TagSet: ''
        }),
        versioning: this.formBuilder.group({
          Status: ''
        }),
        website: this.formBuilder.group({
          ErrorDocument: '',
          IndexDocument: '',
          RedirectHostName: '',
          RedirectProtocol: '',
          WebsiteEnabled: ''
        })
      } as BucketMetadataFormGroup);
      this.newState();
      this.cdf.detectChanges();
    });
  }

  /** Close drawer */
  close(): void {
    this.drawerPanel.close();
  }

  // bind OnChange handlers

  @OnChange('s3meta') newState() {
    if (this.s3meta) {
      this.metadata = <BucketMetadata>this.s3meta[this.desc.path];
      if (this.propsForm) { 
        this.propsForm.reset();
        if (this.metadata) 
          this.propsForm.patchValue(this.metadata, { emitEvent: false });
      }
    }
  }

}
