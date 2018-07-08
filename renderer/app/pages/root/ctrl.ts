import { Actions } from '@ngxs/store';
import { Canceled } from '../../state/status';
import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBGuard } from '../../guards/ddb';
import { EC2Guard } from '../../guards/ec2';
import { ElectronService } from 'ngx-electron';
import { Injector } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { Message } from '../../state/status';
import { Navigate } from '@ngxs/router-plugin';
import { Navigator } from '../../components/navigator';
import { Observable } from 'rxjs';
import { OnChange } from 'ellib';
import { PrefsState } from '../../state/prefs';
import { PrefsStateModel } from '../../state/prefs';
import { Progress } from '../../state/status';
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
import { map } from 'rxjs/operators';
import { nextTick } from 'ellib';
import { of } from 'rxjs';
import { ofAction } from '@ngxs/store';
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
      canNavigate: [EC2Guard],
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
  constructor(private actions$: Actions,
              private electron: ElectronService,
              private injector: Injector,
              private store: Store) {
    super();
    // setup the tabs depending on what is available
    this.tabs$ = combineLatest(this.navigator.map(tab => combineLatest(of(tab), ...this.canNavigate(tab))))
      .pipe(
        map((combined: any[][]) => {
          return combined
            .map((item: any[]) => ({ tab: item[0], flags: item.slice(1) }))
            .filter((item: { tab, flags }) => item.flags.every(can => can))
            .map((item: { tab, flags }) => item.tab);
        })
      );
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
    // handle general Cancel in case of long running main process action 
    this.actions$.pipe(ofAction(Canceled))
      .subscribe(() => this.electron.ipcRenderer.send('cancel'));
    // handle general progress indication from main process 
    this.electron.ipcRenderer.on('progress', (event, progress) => {
      const state = (progress === 100)? 'completed' : 'scaled';
      this.store.dispatch(new Progress({ scale: progress, state }));
      if (progress === 100)
        this.store.dispatch(new Message({ text: '' }));
    });  
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

  private canNavigate(tab: Navigator): Observable<boolean>[] {
    if (!tab.canNavigate)
      return [of(true)];
    else return tab.canNavigate.map(clazz => {
      const guard = this.injector.get(clazz);
      return guard.canActivate();
    });
  }

}
