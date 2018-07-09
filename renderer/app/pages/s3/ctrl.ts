import { Actions } from '@ngxs/store';
import { AutoUnsubscribe } from 'ellib';
import { BucketMetadata } from './state/s3meta';
import { ChangeDetectionStrategy } from '@angular/core';
import { ClearPaths } from './state/s3view';
import { Component } from '@angular/core';
import { CreateBucket } from './state/s3';
import { CreateBucketRequest } from './state/s3';
import { EventEmitter } from '@angular/core';
import { FileMetadata } from './state/s3meta';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { LoadDirectory } from './state/s3';
import { Observable } from 'rxjs/Observable';
import { OnChange } from 'ellib';
import { Output } from '@angular/core';
import { PrefsState } from '../../state/prefs';
import { PrefsStateModel } from '../../state/prefs';
import { Reset } from '../../state/window';
import { S3Filter } from './state/s3filter';
import { S3FilterState } from './state/s3filter';
import { S3FilterStateModel } from './state/s3filter';
import { S3MetaState } from './state/s3meta';
import { S3MetaStateModel } from './state/s3meta';
import { S3SelectionState } from './state/s3selection';
import { S3SelectionStateModel } from './state/s3selection';
import { S3State } from './state/s3';
import { S3StateModel } from './state/s3';
import { S3ViewState } from './state/s3view';
import { S3ViewStateModel } from './state/s3view';
import { Select } from '@ngxs/store';
import { SetFilter } from './state/s3filter';
import { ShowPagePrefs } from '../../state/window';
import { Store } from '@ngxs/store';
import { Subscription } from 'rxjs/Subscription';
import { UpdateBucketMetadata } from './state/s3meta';
import { UpdateFileMetadata } from './state/s3meta';
import { UpdateVisibility } from './state/s3view';
import { ViewVisibility } from './state/s3view';
import { WatcherService } from './services/watcher';

import { config } from '../../config';
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

  @Input() bucketFilterForm = { } as S3Filter;
  @Input() bucketPropsForm = { } as BucketMetadata;
  @Input() createBucketForm = { } as CreateBucketRequest;
  @Input() filePropsForm = { } as FileMetadata;
  @Input() viewForm = { } as S3ViewStateModel;

  @Output() loaded = new EventEmitter<boolean>();
  @Output() openView = new EventEmitter<any>();

  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;
  @Select(S3State) s3$: Observable<S3StateModel>;
  @Select(S3FilterState) s3filter$: Observable<S3FilterStateModel>;
  @Select(S3MetaState) s3meta$: Observable<S3MetaStateModel>;
  @Select(S3SelectionState) selection$: Observable<S3SelectionStateModel>;
  @Select(S3ViewState) view$: Observable<S3ViewStateModel>;

  subToReset: Subscription;
  subToShowPagePrefs: Subscription;

  /** ctor */
  constructor(private actions$: Actions,
              private store: Store,
              private watcher: WatcherService) {
    super();
    // listen for open prefs
    this.subToShowPagePrefs = this.actions$.pipe(ofAction(ShowPagePrefs))
      .subscribe(() => this.openView.emit());
    // clean up on a reset
    this.subToReset = this.actions$.pipe(ofAction(Reset))
      .subscribe(() => this.store.dispatch(new ClearPaths()));
    // load all the data in the view
    // TODO: expire here doesn't work because it's ALWAYS 15 mins between sessions
    // this.store.dispatch(new ExpirePaths());
    const paths = this.store.selectSnapshot(S3ViewState.getPaths);
    paths.forEach(path => {
      this.watcher.watch(path);
      this.store.dispatch(new LoadDirectory({ path }));
    });
  }

  // bind OnChange handlers

  @OnChange('bucketFilterForm') saveBucketFilter(): void {
    if (this.bucketFilterForm && this.bucketFilterForm.submitted) {
      // TODO: why do we need this in Electron? and only running live?
      // at worst, running in NgZone should work -- but otherwise a DOM
      // event is necessary to force change detection
      nextTick(() => {
        const bucket = this.bucketFilterForm.bucket;
        this.store.dispatch(new SetFilter({ bucket, filter: this.bucketFilterForm }));
        this.watcher.touch(bucket + config.s3Delimiter);
      });
    }
  }

  @OnChange('bucketPropsForm') saveBucketProps(): void {
    if (this.bucketPropsForm && this.bucketPropsForm.submitted) {
      // TODO: why do we need this in Electron? and only running live?
      // at worst, running in NgZone should work -- but otherwise a DOM
      // event is necessary to force change detection
      nextTick(() => {
        const path = this.bucketPropsForm.path;
        this.store.dispatch(new UpdateBucketMetadata({ path, metadata: this.bucketPropsForm }));
      });
    }
  }

  @OnChange('createBucketForm') createBucket(): void {
    if (this.createBucketForm && this.createBucketForm.submitted) {
      // TODO: why do we need this in Electron? and only running live?
      // at worst, running in NgZone should work -- but otherwise a DOM
      // event is necessary to force change detection
      nextTick(() => {
        this.store.dispatch(new CreateBucket({ request: this.createBucketForm }));
      });
    }
  }

  @OnChange('filePropsForm') saveFileProps(): void {
    if (this.filePropsForm && this.filePropsForm.submitted) {
      // TODO: why do we need this in Electron? and only running live?
      // at worst, running in NgZone should work -- but otherwise a DOM
      // event is necessary to force change detection
      nextTick(() => {
        const path = this.filePropsForm.path;
        this.store.dispatch(new UpdateFileMetadata({ path, metadata: this.filePropsForm }));
      });
    }
  }

  @OnChange('viewForm') saveView(): void {
    if (this.viewForm && this.viewForm.submitted) {
      // TODO: why do we need this in Electron? and only running live?
      // at worst, running in NgZone should work -- but otherwise a DOM
      // event is necessary to force change detection
      nextTick(() => {
        const visibility: ViewVisibility = { ...this.viewForm.visibility };
        this.store.dispatch(new UpdateVisibility({ visibility }));
      });
    }
  }

}
