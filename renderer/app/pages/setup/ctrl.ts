import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { Observable } from 'rxjs/Observable';
import { OnChange } from 'ellib';
import { PrefsState } from '../../state/prefs';
import { PrefsStateModel } from '../../state/prefs';
import { Select } from '@ngxs/store';
import { Store } from '@ngxs/store';
import { UpdatePrefs } from '../../state/prefs';

import { nextTick } from 'ellib';

/**
 * Setup controller
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-setup-ctrl',
  styles: [':host { display: none; }'],
  template: ''
})

export class SetupCtrlComponent extends LifecycleComponent {

  @Input() prefsForm = {} as PrefsStateModel;

  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;

  /** ctor */
  constructor(private store: Store) {
    super();
  }

  // bind OnChange handlers

  @OnChange('prefsForm') savePrefs() {
    if (this.prefsForm && this.prefsForm.submitted) {
      // TODO: why do we need this in Electron? and only running live?
      // at worst, running in NgZone should work -- but otherwise a DOM
      // event is necessary to force change detection
      nextTick(() => {
        this.store.dispatch(new UpdatePrefs(this.prefsForm));
      });
    }
  }

}
