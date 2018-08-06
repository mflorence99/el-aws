import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DictionaryService } from '../services/dictionary';
import { DrawerPanelComponent } from 'ellib';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { S3ViewStateModel } from '../state/s3view';
import { Validators } from '@angular/forms';
import { ViewVisibilityFormGroup } from '../ctrl';

import { map } from 'rxjs/operators';

/**
 * View component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-view',
  templateUrl: 'view.html',
  styleUrls: ['view.scss']
})

export class ViewComponent extends LifecycleComponent {

  @Input() s3view = { } as S3ViewStateModel;

  viewForm: FormGroup;

  /** ctor */
  constructor(public dictSvc: DictionaryService,
              private drawerPanel: DrawerPanelComponent,
              private formBuilder: FormBuilder) {
    super();
    // derive visibility controls from dictionary
    const visibility = this.dictSvc.dictionary().reduce((acc, entry) => {
      acc[entry.name] = '';
      return acc;
    }, { } as ViewVisibilityFormGroup);
    // create view form controls
    this.viewForm = this.formBuilder.group({
      atLeastOne: ['', Validators.required],
      submitted: '',
      visibility: this.formBuilder.group(visibility)
    });
    // make sure at least one visibility
    this.viewForm.get('visibility').valueChanges
      .pipe(
        map(visibility => Object.entries(visibility)),
        map(entries => entries.some(entry => !!entry[1])),
        map(atLeastOne => atLeastOne? 'atLeastOne' : null)
      ).subscribe(atLeastOne => this.viewForm.get('atLeastOne').setValue(atLeastOne));
  }

  /** Close drawer */
  close(): void {
    this.drawerPanel.close();
  }

  // bind OnChange handlers

  @OnChange('s3view') newState(): void {
    if (this.s3view && this.s3view.visibility)
      this.viewForm.patchValue({ visibility: this.s3view.visibility }, { emitEvent: true });
  }

}
