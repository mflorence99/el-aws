import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBGuard } from '../../guards/ddb';
import { ElectronService } from 'ngx-electron';
import { Injector } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { Navigate } from '@ngxs/router-plugin';
import { Navigator } from '../../components/navigator';
import { Observable } from 'rxjs';
import { OnChange } from 'ellib';
import { PrefsState } from '../../state/prefs';
import { PrefsStateModel } from '../../state/prefs';
import { RouterState } from '@ngxs/router-plugin';
import { RouterStateModel } from '@ngxs/router-plugin';
import { S3Guard } from '../../guards/s3';
import { Select } from '@ngxs/store';
import { SetBounds } from '../../state/window';
import { SetupGuard } from '../../guards/setup';
import { StatusState } from '../../state/status';
import { StatusStateModel } from '../../state/status';
import { Store } from '@ngxs/store';
import { UpdatePrefs } from '../../state/prefs';
import { WindowState } from '../../state/window';
import { WindowStateModel } from '../../state/window';

import { combineLatest } from 'rxjs';
import { config } from '../../config';
import { debounce } from 'ellib';
import { nextTick } from 'ellib';
import { of } from 'rxjs';
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

  tabs$: Observable<Navigator[]>;

  private navigator: Navigator[] = [

    {
      canNavigate: [DDBGuard],
      color: 'var(--mat-amber-a400)',
      icon: ['fas', 'database'],
      route: '/ddb',
      title: 'DDB'
    },

    {
      color: 'var(--mat-orange-a400)',
      icon: ['fas', 'server'],
      route: '/ec2',
      title: 'EC2'
    },

    {
      canNavigate: [S3Guard],
      color: 'var(--mat-yellow-a400)',
      icon: ['fas', 'archive'],
      route: '/s3',
      title: 'S3'
    },

    {
      canNavigate: [SetupGuard],
      color: 'white',
      icon: ['fas', 'cog'],
      route: '/setup',
      title: 'Setup'
    }

  ];

  /** ctor */
  constructor(private electron: ElectronService,
              private injector: Injector,
              private store: Store) {
    super();
    // setup the tabs depending on what is available
    this.tabs$ = combineLatest(this.navigator
      .filter(tab => this.canNavigate(tab).every(can => can))
      .map(tab => of(tab)));
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

  // private methods

  private canNavigate(tab: Navigator): boolean[] {
    if (!tab.canNavigate)
      return [true];
    else return tab.canNavigate.map(clazz => {
      const guard = this.injector.get(clazz);
      return guard.canNavigate();
    });
  }

}
