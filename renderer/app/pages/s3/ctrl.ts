import { Actions } from '@ngxs/store';
import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { Observable } from 'rxjs/Observable';
import { OnChange } from 'ellib';
import { Output } from '@angular/core';
import { PrefsState } from '../../state/prefs';
import { PrefsStateModel } from '../../state/prefs';
import { S3ViewState } from './state/s3view';
import { S3ViewStateModel } from './state/s3view';
import { Select } from '@ngxs/store';
import { ShowPagePrefs } from '../../state/window';
import { Store } from '@ngxs/store';
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

export class S3CtrlComponent extends LifecycleComponent {

  @Input() viewForm: any = { };

  @Output() openView = new EventEmitter<any>();

  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;
  @Select(S3ViewState) view$: Observable<S3ViewStateModel>;

  /** ctor */
  constructor(private actions$: Actions,
              private store: Store) {
    super();
    this.actions$.pipe(ofAction(ShowPagePrefs))
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
