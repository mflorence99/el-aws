import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { Navigate } from '@ngxs/router-plugin';
import { Observable } from 'rxjs/Observable';
import { OnChange } from 'ellib';
import { PrefsState } from '../../state/prefs';
import { PrefsStateModel } from '../../state/prefs';
import { RouterState } from '@ngxs/router-plugin';
import { RouterStateModel } from '@ngxs/router-plugin';
import { Select } from '@ngxs/store';
import { SetBounds } from '../../state/window';
import { StatusState } from '../../state/status';
import { StatusStateModel } from '../../state/status';
import { Store } from '@ngxs/store';
import { UpdatePrefs } from '../../state/prefs';
import { WindowState } from '../../state/window';
import { WindowStateModel } from '../../state/window';

import { config } from '../../config';
import { debounce } from 'ellib';
import { nextTick } from 'ellib';
import { take } from 'rxjs/operators';

/**
 * Root controller
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush, 
  selector: 'elaws-root-ctrl',
  styles: [':host { display: none; }'],  
  template: ''
})

export class RootCtrlComponent extends LifecycleComponent {       

  @Input() prefsForm = {} as PrefsStateModel;

  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;
  @Select(RouterState) router$: Observable<RouterStateModel>;
  @Select(StatusState) status$: Observable<StatusStateModel>;
  @Select(WindowState) window$: Observable<WindowStateModel>; 

  /** ctor */
  constructor(private electron: ElectronService,
              private store: Store) {   
    super();
    // set the initial bounds
    this.window$.pipe(take(1))
      .subscribe((window: WindowStateModel) => {
        const win = this.electron.remote.getCurrentWindow();
        if (window.bounds)
          win.setBounds(window.bounds);
        this.store.dispatch(new Navigate([window.route || '/noop']));
      });
    // record the bounds when they change
    this.electron.ipcRenderer.on('bounds', debounce((event, bounds) => {
      this.store.dispatch(new SetBounds(bounds));
    }, config.setBoundsThrottle));   
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
