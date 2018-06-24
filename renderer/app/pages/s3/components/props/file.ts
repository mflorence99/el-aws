import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { Descriptor } from '../../state/s3';
import { DrawerPanelComponent } from 'ellib';
import { FileMetadata } from '../../services/s3';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { LoadFileMetadata } from '../../state/s3meta';
import { OnChange } from 'ellib';
import { S3MetaStateModel } from '../../state/s3meta';
import { Store } from '@ngxs/store';

/**
 * File props component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-file-props',
  templateUrl: 'file.html',
  styleUrls: ['file.scss']
})

export class FilePropsComponent extends LifecycleComponent {

  @Input() s3meta = { } as S3MetaStateModel;

  desc = { } as Descriptor;
  metadata = { } as FileMetadata;

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
              private drawerPanel: DrawerPanelComponent,
              private store: Store) {
    super();
    // when we are opened we get a new context
    this.drawerPanel.opened.subscribe(context => {
      this.desc = <Descriptor>context;
      this.store.dispatch(new LoadFileMetadata({ path: this.desc.path}));
      this.cdf.detectChanges();
    });
  }

  // bind OnChange handlers

  @OnChange('s3meta') newMeta() {
    if (this.s3meta)
      this.metadata = <FileMetadata>this.s3meta[this.desc.path];
  }

}
