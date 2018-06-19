import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DrawerPanelComponent } from 'ellib';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { PrefsStateModel } from '../../state/prefs';

/**
 * Prefs page
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-prefs',
  styleUrls: ['prefs.scss'],
  templateUrl: 'prefs.html'
})

export class PrefsComponent extends LifecycleComponent { 

  @Input() prefs = {} as PrefsStateModel;

  prefsForm: FormGroup;

  /** ctor */
  constructor(private drawerPanel: DrawerPanelComponent,
    private formBuilder: FormBuilder) {
    super();
    // create prefs form controls
    this.prefsForm = this.formBuilder.group({
      // NOTE: later
    });
  }

  /** Close drawer */
  close() {
    this.drawerPanel.close();
  }

  // bind OnChange handlers

  @OnChange('prefs') patchPrefs() {
    if (this.prefs)
      this.prefsForm.patchValue(this.prefs, { emitEvent: false });
  }

}
