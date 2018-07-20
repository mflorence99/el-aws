import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DrawerPanelComponent } from 'ellib';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { Input } from '@angular/core';
import { OnInit } from '@angular/core';
import { PrefsStateModel } from '../../../../state/prefs';
import { Validators } from '@angular/forms';

import { config } from '../../../../config';

/**
 * Create bucket component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-create-bucket',
  templateUrl: 'create.html',
  styleUrls: ['props.scss']
})

export class CreateBucketComponent implements OnInit {

  @Input() prefs = { } as PrefsStateModel;

  createForm: FormGroup;

  /** ctor */
  constructor(private drawerPanel: DrawerPanelComponent,
              private formBuilder: FormBuilder) {
    this.createForm = this.formBuilder.group({
      ACL: ['', Validators.required],
      Bucket: ['', [
        Validators.required, 
        Validators.pattern(config.s3.bucketValidationPattern)
      ]],
      Region: ['', Validators.required]
    });
  }

  /** Close drawer */
  close(): void {
    this.drawerPanel.close();
  }

  // lifecycle methods

  ngOnInit(): void {
    // set defaults
    this.createForm.patchValue({ ACL: 'private', Region: this.prefs.region });
  }

}
