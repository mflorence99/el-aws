import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { PrefsStateModel } from '../../state/prefs';
import { PrefsStateModelFormGroup } from '../../state/prefs';
import { Validators } from '@angular/forms';

import { config } from '../../config';

/**
 * Setup page
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-setup',
  styleUrls: ['setup.scss'],
  templateUrl: 'setup.html'
})

export class SetupComponent extends LifecycleComponent {

  @Input() prefs = { } as PrefsStateModel;

  prefsForm: FormGroup;

  /** ctor */
  constructor(private formBuilder: FormBuilder) {
    super();
    // create prefs form controls
    this.prefsForm = this.formBuilder.group({
      configured: '',
      endpoints: this.formBuilder.group({
        ddb: ['', [Validators.pattern(config.urlValidationPattern)]],
        ec2: ['', [Validators.pattern(config.urlValidationPattern)]],
        s3: ['', [Validators.pattern(config.urlValidationPattern)]]
      }),
      region: ['', Validators.required]
    } as PrefsStateModelFormGroup);
  }

  // bind OnChange handlers

  @OnChange('prefs') newState() {
    if (this.prefs)
      this.prefsForm.patchValue(this.prefs, { emitEvent: false });
  }

}
