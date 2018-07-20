import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { Descriptor } from '../../state/s3';
import { DrawerPanelComponent } from 'ellib';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { S3Filter } from '../../state/s3filter';
import { S3FilterState } from '../../state/s3filter';
import { S3FilterStateModel } from '../../state/s3filter';
import { Validators } from '@angular/forms';

/**
 * Bucket filter component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-bucket-filter',
  templateUrl: 'filter.html',
  styleUrls: ['props.scss']
})

export class BucketFilterComponent extends LifecycleComponent {

  @Input() s3filter = { } as S3FilterStateModel;

  desc = { } as Descriptor;
  filter = { } as S3Filter;
  filterForm: FormGroup;

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
              private drawerPanel: DrawerPanelComponent,
              private formBuilder: FormBuilder) {
    super();
    // when we are opened we get a new context
    this.drawerPanel.opened.subscribe(context => {
      this.desc = <Descriptor>context;
      this.filterForm = this.formBuilder.group({
        bucket: '',
        match: '',
        period: ['', Validators.required]
      });
      this.newFilter();
      this.cdf.detectChanges();
    });
  }

  /** Close drawer */
  close(): void {
    this.drawerPanel.close();
  }

  // bind OnChange handlers

  @OnChange('s3filter') newFilter() {
    if (this.s3filter) {
      this.filter = <S3Filter>this.s3filter[this.desc.name];
      if (this.filterForm) {
        this.filterForm.reset();
        if (!this.filter)
          this.filter = { bucket: this.desc.name, ...S3FilterState.filterDefaults() };
        this.filterForm.patchValue(this.filter, { emitEvent: false });
      }
    }
  }

}
