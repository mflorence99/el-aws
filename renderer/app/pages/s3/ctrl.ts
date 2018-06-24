import { Actions } from '@ngxs/store';
import { AutoUnsubscribe } from 'ellib';
import { BucketsLoaded } from './state/s3';
import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { LoadDirectory } from './state/s3';
import { Observable } from 'rxjs/Observable';
import { OnChange } from 'ellib';
import { Output } from '@angular/core';
import { PrefsState } from '../../state/prefs';
import { PrefsStateModel } from '../../state/prefs';
import { S3MetaState } from './state/s3meta';
import { S3MetaStateModel } from './state/s3meta';
import { S3State } from './state/s3';
import { S3StateModel } from './state/s3';
import { S3ViewState } from './state/s3view';
import { S3ViewStateModel } from './state/s3view';
import { Select } from '@ngxs/store';
import { ShowPagePrefs } from '../../state/window';
import { Store } from '@ngxs/store';
import { Subscription } from 'rxjs/Subscription';
import { UpdateVisibility } from './state/s3view';
import { ViewVisibility } from './state/s3view';

import { nextTick } from 'ellib';
import { ofAction } from '@ngxs/store';

/**
 * S3 controller
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-s3-ctrl',
  styles: [':host { display: none; }'],
  template: ''
})

@AutoUnsubscribe()
export class S3CtrlComponent extends LifecycleComponent {

  @Input() viewForm: any = { };

  @Output() loaded = new EventEmitter<boolean>();
  @Output() openView = new EventEmitter<any>();

  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;
  @Select(S3State) s3$: Observable<S3StateModel>;
  @Select(S3MetaState) s3meta$: Observable<S3MetaStateModel>;
  @Select(S3ViewState) view$: Observable<S3ViewStateModel>;

  subToLoaded: Subscription;
  subToShowPagePrefs: Subscription;

  /** ctor */
  constructor(private actions$: Actions,
              private store: Store) {
    super();
    const paths = this.store.selectSnapshot(S3ViewState.getPaths);
    paths.forEach(path => this.store.dispatch(new LoadDirectory({ path })));
    // listen for initial load complete
    this.subToLoaded = this.actions$.pipe(ofAction(BucketsLoaded))
      .subscribe(() => this.loaded.emit(true));
    // listen for open prefs
    this.subToShowPagePrefs = this.actions$.pipe(ofAction(ShowPagePrefs))
      .subscribe(() => this.openView.emit());
  }

  @OnChange('viewForm') saveView(): void {
    if (this.viewForm && this.viewForm.submitted) {
      // TODO: why do we need this in Electron? and only running live?
      // at worst, running in NgZone shoukd work -- but otherwise a DOM
      // event is necessary to force change detection
      nextTick(() => {
        const visibility: ViewVisibility = { ...this.viewForm.visibility };
        this.store.dispatch(new UpdateVisibility({ visibility }));
      });
    }
  }

}
