import { BucketMetadata } from '../../services/s3';
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
  loggingEnabled: boolean;
  websiteEnabled: string;

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
        path: '',
        accelerate: this.formBuilder.group({
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
          LoggingEnabled: this.formBuilder.group({
            TargetBucket: '',
            TargetPrefix: '',
            TargetGrants: this.formBuilder.array([ ])
          })
        }),
        tagging: this.formBuilder.group({
          TagSet: ''
        }),
        versioning: this.formBuilder.group({
          Status: ''
        }),
        website: this.formBuilder.group({
          RedirectAllRequestsTo: this.formBuilder.group({
            HostName: '',
            Protocol: ''
          }),
          IndexDocument: this.formBuilder.group({
            Suffix: ''
          }),
          ErrorDocument: this.formBuilder.group({
            Key: ''
          })
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

  /** Enforce AWS logging semantics in the UI */
  enableLogging(state: boolean): void {
    this.loggingEnabled = state;
    const patch: any = { logging: { LoggingEnabled: { } } };
    if (!this.loggingEnabled) 
      patch.logging.LoggingEnabled = { TargetBucket: null, TargetPrefix: null };
    this.propsForm.patchValue({ ...patch }, { emitEvent: false });
  }

  /** Enforce AWS website semantics in the UI */
  enableWebsite(state: string): void {
    this.websiteEnabled = state;
    const patch: any = { website: { RedirectAllRequestsTo: { }, IndexDocument: { }, ErrorDocument: { } } };
    if (this.websiteEnabled === 'Off') {
      patch.website.RedirectAllRequestsTo = { HostName: null, Protocol: null };
      patch.website.IndexDocument = { Suffix: null };
      patch.website.ErrorDocument = { Key: null };
    }
    else if (this.websiteEnabled === 'On') 
      patch.website.RedirectAllRequestsTo = { HostName: null, Protocol: null };
    else if (this.websiteEnabled === 'Redirect') {
      patch.website.IndexDocument = { Suffix: null };
      patch.website.ErrorDocument = { Key: null };
    }
    this.propsForm.patchValue({ ...patch }, { emitEvent: false });
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
          this.loggingEnabled = !!(this.metadata.logging.LoggingEnabled && this.metadata.logging.LoggingEnabled.TargetBucket);
          this.websiteEnabled = 'Off';
          if (this.metadata.website.IndexDocument)
            this.websiteEnabled = 'On';
          else if (this.metadata.website.RedirectAllRequestsTo)
            this.websiteEnabled = 'Redirect';
          this.propsForm.patchValue({ ...this.metadata, path: this.desc.path }, 
                                    { emitEvent: false });
        }
      }
    }
  }

}
