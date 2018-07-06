import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DrawerPanelComponent } from 'ellib';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';

/**
 * Bucket props component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-create-bucket',
  templateUrl: 'create.html',
  styleUrls: ['create.scss']
})

export class CreateBucketComponent {

  createForm: FormGroup;

  /** ctor */
  constructor(private drawerPanel: DrawerPanelComponent,
              private formBuilder: FormBuilder) {
    this.createForm = this.formBuilder.group({
      ACL: '',
      Bucket: '',
      Region: ''
    });
  }

  /** Close drawer */
  close(): void {
    this.drawerPanel.close();
  }

}
