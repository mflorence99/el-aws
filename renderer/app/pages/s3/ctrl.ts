import { Actions } from '@ngxs/store';
import { AutoUnsubscribe } from 'ellib';
import { BucketMetadata } from './state/s3meta';
import { Canceled } from '../../state/status';
import { ChangeDetectionStrategy } from '@angular/core';
import { ClearPaths } from './state/s3view';
import { Component } from '@angular/core';
import { CreateBucket } from './state/s3';
import { CreateBucketRequest } from './state/s3';
import { ElectronService } from 'ngx-electron';
import { EventEmitter } from '@angular/core';
import { FileMetadata } from './state/s3meta';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { LoadDirectory } from './state/s3';
import { Message } from '../../state/status';
import { NgZone } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { OnChange } from 'ellib';
import { Output } from '@angular/core';
import { PathService } from './services/path';
import { PrefsState } from '../../state/prefs';
import { PrefsStateModel } from '../../state/prefs';
import { Progress } from '../../state/status';
import { Reset } from '../../state/window';
import { S3Filter } from './state/s3filter';
import { S3FilterState } from './state/s3filter';
import { S3FilterStateModel } from './state/s3filter';
import { S3MetaState } from './state/s3meta';
import { S3MetaStateModel } from './state/s3meta';
import { S3SelectionState } from './state/s3selection';
import { S3SelectionStateModel } from './state/s3selection';
import { S3Service } from './services/s3';
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

  subToCancel: Subscription;
  subToReset: Subscription;
  subToShowPagePrefs: Subscription;

  /** ctor */
  constructor(private actions$: Actions,
              private electron: ElectronService,
              private path: PathService,
              private s3Svc: S3Service,
              private store: Store,
              private watcher: WatcherService,
              private zone: NgZone) {
    super();
    this.loadInitialPaths();
    this.handleActions();
    this.electron.ipcRenderer.on('s3upload', this.handleUpload.bind(this));
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
        // touch everything open with this path
        this.store.selectSnapshot(S3ViewState.getPaths)
          .filter(path => path.startsWith(bucket))
          .forEach(path => this.watcher.touch(path));
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

  // private methods

  private handleActions(): void {
    // listen for open prefs
    this.subToShowPagePrefs = this.actions$.pipe(ofAction(ShowPagePrefs))
      .subscribe(() => this.openView.emit());
    // clean up on a reset
    this.subToReset = this.actions$.pipe(ofAction(Reset))
      .subscribe(() => this.store.dispatch(new ClearPaths()));
    // cancel long-running operation
    this.subToCancel = this.actions$.pipe(ofAction(Canceled))
      .subscribe(() => {
        this.zone.run(() => {
          this.store.dispatch(new Progress({ state: 'completed' }));
          this.s3Svc.cancelUpload();
        });
      });
  }

  private handleUpload(event, 
                       base: string,
                       source: string): void {
    const path = this.electron.remote.require('path');
    const filename = path.basename(source);
    const fs = this.electron.remote.require('fs');
    const stream = fs.createReadStream(source);
    this.zone.run(() => {
      this.store.dispatch(new Message({ text: `Uploading ${source} ...` }));
    });
    this.s3Svc.uploadObject(`${base}${filename}`, stream, 
      this.handleUploadProgress.bind(this), 
      this.handleUploadCompleted.bind(this, base, source));
  }

  private handleUploadCompleted(base: string,
                                source: string): void {
    this.watcher.touch(base);
    this.zone.run(() => {
      this.store.dispatch(new Progress({ scale: 100, state: 'completed' }));
      this.store.dispatch(new Message({ text: `Uploaded ${source}` }));
    });
  }

  private handleUploadProgress(percent: number): void {
    this.zone.run(() => {
      const state = (percent === 100) ? 'completed' : 'scaled';
      this.store.dispatch(new Progress({ scale: percent, state }));
    });
  }

  private loadInitialPaths(): void {
    // TODO: expire here doesn't work because it's ALWAYS 15 mins between sessions
    // this.store.dispatch(new ExpirePaths());
    // only premptively load paths whose parent has been loaded
    // NOTE: sorting guarantees that a parent is loaded before its children
    const loaded = { };
    this.store.selectSnapshot(S3ViewState.getPaths)
      .sort()
      .forEach(path => {
        const { parent } = this.path.analyze(path);
        if (!parent || loaded[parent]) {
          loaded[path] = true;
          this.watcher.watch(path);
          this.store.dispatch(new LoadDirectory({ path }));
        }
      });
  }

}
