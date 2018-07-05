import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { Descriptor } from '../../state/s3';
import { DrawerPanelComponent } from 'ellib';
import { FileMetadata } from '../../state/s3meta';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { LoadFileMetadata } from '../../state/s3meta';
import { OnChange } from 'ellib';
import { PrefsStateModel } from '../../../../state/prefs';
import { S3MetaStateModel } from '../../state/s3meta';
import { Store } from '@ngxs/store';

import { showHideAnimation } from 'ellib';

/**
 * File props component
 */

@Component({
  animations: [showHideAnimation()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-file-props',
  templateUrl: 'file.html',
  styleUrls: ['file.scss']
})

export class FilePropsComponent extends LifecycleComponent {

  @Input() prefs = {} as PrefsStateModel;
  @Input() s3meta = { } as S3MetaStateModel;

  desc = { } as Descriptor;
  metadata = { } as FileMetadata;
  propsForm: FormGroup;

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
      this.store.dispatch(new LoadFileMetadata({ path: this.desc.path}));
      this.propsForm = this.formBuilder.group({
        acl: this.formBuilder.group({
          Grants: this.formBuilder.array([
            // NOTE: exactly twice
            this.formBuilder.group({ Grantee: '', ReadAcl: '', ReadObjects: '', WriteAcl: '', WriteObjects: '' }),
            this.formBuilder.group({ Grantee: '', ReadAcl: '', ReadObjects: '', WriteAcl: '', WriteObjects: '' })
          ]),
          Owner: ''
        }),
        head: this.formBuilder.group({
          encryption: this.formBuilder.group({
            KMSMasterKeyID: '',
            SSEAlgorithm: ''
          }),
          storage: this.formBuilder.group({
            StorageClass: ''
          }),
        }),
        path: '',
        tagging: this.formBuilder.group({
          TagSet: ''
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
      this.metadata = <FileMetadata>this.s3meta[this.desc.path];
      if (this.propsForm) {
        this.propsForm.reset();
        if (this.metadata) 
          this.propsForm.patchValue(this.metadata, { emitEvent: false });
      }
    }
  }

}
