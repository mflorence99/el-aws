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
import { S3MetaStateModel } from '../../state/s3meta';
import { Store } from '@ngxs/store';

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

  @Input() s3meta = {} as S3MetaStateModel;

  desc = {} as Descriptor;
  metadata = {} as BucketMetadata;
  propsForm: FormGroup;

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
      // create props form controls
      this.propsForm = this.formBuilder.group({
        path: this.desc.path,
        accelerate: this.formBuilder.group({
          Status: ''
        }),
        versioning: this.formBuilder.group({
          Status: ''
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

  // bind OnChange handlers

  @OnChange('s3meta') newMetadata() {
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
