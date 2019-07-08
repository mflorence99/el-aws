import { AutoUnsubscribe } from 'ellib';
import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { DeleteBucket } from '../state/s3';
import { DeleteObjects } from '../state/s3';
import { Descriptor } from '../state/s3';
import { Dictionary } from '../services/dictionary';
import { DictionaryService } from '../services/dictionary';
import { ElectronService } from 'ngx-electron';
import { EventEmitter } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { Message } from '../../../state/status';
import { NgZone } from '@angular/core';
import { OnChange } from 'ellib';
import { Output } from '@angular/core';
import { PrefsStateModel } from '../../../state/prefs';
import { RemovePath } from '../state/s3view';
import { RemovePaths } from '../state/s3view';
import { S3FilterStateModel } from '../state/s3filter';
import { S3MetaStateModel } from '../state/s3meta';
import { S3SelectionStateModel } from '../state/s3selection';
import { S3Service } from '../services/s3';
import { S3StateModel } from '../state/s3';
import { S3ViewStateModel } from '../state/s3view';
import { Store } from '@ngxs/store';
import { Subscription } from 'rxjs';
import { ViewChild } from '@angular/core';

import { config } from '../../../config';
import { debounce } from 'ellib';

/**
 * S3 tree component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-tree',
  styleUrls: ['tree.scss'],
  templateUrl: 'tree.html'
})

@AutoUnsubscribe()
export class TreeComponent extends LifecycleComponent {

  @Input() prefs = { } as PrefsStateModel;
  @Input() s3 = { } as S3StateModel;
  @Input() s3filter = { } as S3FilterStateModel;
  @Input() s3meta = { } as S3MetaStateModel;
  @Input() s3selection = { } as S3SelectionStateModel;
  @Input() s3view = { } as S3ViewStateModel;

  @Output() createBucket = new EventEmitter<void>();
  @Output() editBucketFilter = new EventEmitter<Descriptor>();
  @Output() editBucketProps = new EventEmitter<Descriptor>();
  @Output() editFileProps = new EventEmitter<Descriptor>();

  @ViewChild(ContextMenuComponent, { static: true }) contextMenu: ContextMenuComponent;

  descriptorsByPath: { [path: string]: Descriptor[] } = { };
  dictionary: Dictionary[] = [];

  newName: string;

  subToActions: Subscription;

  private newStateImpl: Function;

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
              private dictSvc: DictionaryService,
              private electron: ElectronService,
              private s3Svc: S3Service,
              private store: Store,
              private zone: NgZone) {
    super();
    this.newStateImpl = debounce(this._newStateImpl, config.s3.treeRefreshThrottle);
  }

  /** Are all buckets loaded? */
  areBucketsLoaded(): boolean {
    return !!this.s3[config.s3.delimiter];
  }

  /** Is new name allowed? */
  canNewName(): boolean {
    return this.newName && (this.newName.length > 0);
  }

  /** Is this the kind of path that has children? */
  hasChildren(desc: Descriptor): boolean {
    return desc
      && (desc.isBucket || desc.isDirectory || (desc.isFile && desc.isFileVersioned));
  }

  /** Is this an object that has properties? */
  hasProperties(desc: Descriptor): boolean {
    return this.isBucket(desc) || this.isFile(desc) || this.isFileVersion(desc);
  }

  /** Is this an object that has a URL? */
  hasURL(desc: Descriptor): boolean {
    return this.isFile(desc) || this.isFileVersion(desc);
  }

  /** Is context menu bound to a bucket? */
  isBucket(desc: Descriptor): boolean {
    return desc && desc.isBucket;
  }

  /** Is this some kind of descriptor? */
  isDescriptor(desc: Descriptor): boolean {
    return !!desc;
  }

  /** Is context menu bound to a directory? */
  isDirectory(desc: Descriptor): boolean {
    return desc && desc.isDirectory;
  }

  /** Is this path empty? */
  isEmpty(desc: Descriptor): boolean {
    return this.hasChildren(desc)
      && !!this.s3[desc.path]
      && (this.s3[desc.path].length === 0);
  }

  /** Is this path expandable? */
  isExpandable(desc: Descriptor): boolean {
    return this.hasChildren(desc)
      && this.s3view.paths.includes(desc.path);
  }

  /** Is this path expanded? */
  isExpanded(desc: Descriptor): boolean {
    return this.hasChildren(desc)
      && this.s3view.paths.includes(desc.path)
      && !!this.s3[desc.path];
  }

  /** Is this path expanding? */
  isExpanding(desc: Descriptor): boolean {
    return this.hasChildren(desc)
      && this.s3view.paths.includes(desc.path)
      && !this.s3[desc.path];
  }

  /** Is context menu bound to a file? */
  isFile(desc: Descriptor): boolean {
    return desc && desc.isFile;
  }

  /** Is context menu bound to a file version? */
  isFileVersion(desc: Descriptor): boolean {
    return desc && desc.isFileVersion;
  }

  /** Is context menu bound to an object? */
  isObject(desc: Descriptor): boolean {
    return desc && (desc.isFile || desc.isFileVersion);
  }

  /** Helper for ternary expr in template */
  noop(): void { }

  /** Prepare for a new name */
  prepareNewName(initial: string,
    ctrl: HTMLInputElement): string {
    if (!ctrl.getAttribute('_init')) {
      ctrl.setAttribute('_init', 'true');
      setTimeout(() => {
        ctrl.value = this.newName = initial;
        const ix = initial.lastIndexOf('.');
        if (ix === -1)
          ctrl.select();
        else ctrl.setSelectionRange(0, ix);
        ctrl.focus();
      }, config.s3.prepareNewNameDelay);
    }
    return this.newName;
  }

  // event handlers

  onExecute(event: {event?: MouseEvent,
                    item: Descriptor},
            command: string): void {
    let base;
    const desc = event.item || <Descriptor>{ isDirectory: true, path: this.s3view.paths[0] };
    switch (command) {

      // these commands are singular

      case 'create':
        this.createBucket.emit();
        break;

      case 'delete-bucket':
        this.store.dispatch(new DeleteBucket({ path: desc.path }));
        this.store.dispatch(new RemovePath({ path: desc.path }));
        break;

      case 'download':
        this.s3Svc.getSignedURL(desc.path, url => {
          this.zone.run(() => {
            this.electron.ipcRenderer.send('s3download', url);
            this.store.dispatch(new Message({ text: `Downloading ${desc.name} ...` }));
          });
        });
        break;

      case 'filter':
        this.editBucketFilter.emit(desc);
        break;

      case 'new-dir':
        base = desc.path;
        if (desc.isFile || desc.isFileVersion) {
          const ix = desc.path.lastIndexOf(config.s3.delimiter);
          base = desc.path.substring(0, ix + 1);
        }
        const dir = `${base}${this.newName}${config.s3.delimiter}`;
        this.s3Svc.createDirectory(dir, () => {
          this.zone.run(() => {
            this.store.dispatch(new Message({ text: `Created directory ${dir}` }));
          });
        });
        break;

      case 'properties':
        if (desc.isBucket)
          this.editBucketProps.emit(desc);
        else if (desc.isFile || desc.isFileVersion)
          this.editFileProps.emit(desc);
        break;

      case 'upload':
        base = desc.path;
        if (desc.isFile || desc.isFileVersion) {
          const ix = desc.path.lastIndexOf(config.s3.delimiter);
          base = desc.path.substring(0, ix + 1);
        }
        this.electron.ipcRenderer.send('s3upload', base);
        break;

      case 'url':
        this.s3Svc.getSignedURL(desc.path, url => {
          this.zone.run(() => {
            this.electron.clipboard.writeText(url);
            this.store.dispatch(new Message({ text: `Copied ${url} to clipboard` }));
          });
        });
        break;

      // these commands affect the entire selection

      case 'delete-objects':
        this.store.dispatch(new DeleteObjects({ paths: this.s3selection.paths }));
        this.store.dispatch(new RemovePaths({ paths: this.s3selection.paths }));
        break;

    }
    // if event is missing, that means we were invoked programatically
    // so we need to close the menu ourselves
    if (!event.event)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  }

  onNewName(name: string): void {
    this.newName = name;
  }

  // bind OnChange handlers

  @OnChange('prefs', 's3', 's3meta', 's3view') newState(): void {
    if (this.prefs && this.s3 && this.s3meta && this.s3view)
      this.newStateImpl();
  }

  // private methods

  private _newStateImpl(): void {
    this.dictionary = this.dictSvc.dictionaryForView(this.s3view);
    this.s3view.paths.forEach(path => {
      this.descriptorsByPath[path] =
        this.dictSvc.descriptorsForView(path, 
                                        this.s3, 
                                        this.dictionary, 
                                        this.prefs, 
                                        this.s3view);
    });
    this.cdf.detectChanges();
  }

} 
