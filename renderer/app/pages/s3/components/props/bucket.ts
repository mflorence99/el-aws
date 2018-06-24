import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { Descriptor } from '../../state/s3';
import { DrawerPanelComponent } from 'ellib';
import { Input } from '@angular/core';
import { S3MetaStateModel } from '../../state/s3meta';

/**
 * Bucket props component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-bucket-props',
  templateUrl: 'bucket.html',
  styleUrls: ['bucket.scss']
})

export class BucketPropsComponent {

  @Input() s3meta = {} as S3MetaStateModel;

  desc = {} as Descriptor;

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
    private drawerPanel: DrawerPanelComponent) {
    // when we are opened we get a new context
    this.drawerPanel.opened.subscribe(context => {
      this.desc = <Descriptor>context;
      this.cdf.detectChanges();
    });
  }

}
