import { BucketMetadata } from '../../state/s3meta';
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

import { nullSafe } from 'ellib';

/**
 * Bucket props component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-bucket-props',
  templateUrl: 'bucket.html',
  styleUrls: ['bucket.scss']
})

export class BucketPropsComponent extends LifecycleComponent {

  @Input() prefs = {} as PrefsStateModel;
  @Input() s3meta = {} as S3MetaStateModel;

  desc = {} as Descriptor;
  metadata = {} as BucketMetadata;
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
        encryption: this.formBuilder.group({
          ServerSideEncryptionConfiguration: this.formBuilder.group({
            Rules: this.formBuilder.array([
              this.formBuilder.group({
                ApplyServerSideEncryptionByDefault: this.formBuilder.group({
                  SSEAlgorithm: '',
                  KMSMasterKeyID: ''
                })
              })
            ])
          })
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
      });
      this.newMetadata();
      this.cdf.detectChanges();
    });
  }

  /** Close drawer */
  close(): void {
    this.drawerPanel.close();
  }

  /** Enforce AWS encryption semantics in the UI */
  enableEncryption(state: string): void {
    this.encryptionEnabled = state;
    const patch: any = { encryption: { ServerSideEncryptionConfiguration: { Rules: [{ ApplyServerSideEncryptionByDefault: { } } ]} } };
    if (this.encryptionEnabled === 'AES256') {
      patch.encryption.ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.KMSMasterKeyID = null;
      this.propsForm.patchValue({ ...patch }, { emitEvent: false });
    }
  }

  // bind OnChange handlers

  @OnChange('s3meta') newMetadata() {
    if (this.s3meta) {
      this.metadata = <BucketMetadata>this.s3meta[this.desc.path];
      if (this.propsForm) { 
        this.propsForm.reset();
        if (this.metadata) {
          // UI assist
          this.encryptionEnabled = nullSafe(this.metadata.encryption, 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm');
          this.propsForm.patchValue(this.metadata, { emitEvent: false });
        }
      }
    }
  }

}
