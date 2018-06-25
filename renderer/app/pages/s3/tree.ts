import { AutoUnsubscribe } from 'ellib';
import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { Descriptor } from './state/s3';
import { Dictionary } from './services/dictionary';
import { DictionaryService } from './services/dictionary';
import { ElectronService } from 'ngx-electron';
import { EventEmitter } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { Message } from '../../state/status';
import { OnChange } from 'ellib';
import { Output } from '@angular/core';
import { PrefsStateModel } from '../../state/prefs';
import { S3MetaStateModel } from './state/s3meta';
import { S3StateModel } from './state/s3';
import { S3ViewStateModel } from './state/s3view';
import { Store } from '@ngxs/store';
import { Subscription } from 'rxjs';
import { ViewChild } from '@angular/core';

import { config } from '../../config';
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

  @Input() prefs = {} as PrefsStateModel;
  @Input() view = {} as S3ViewStateModel;
  @Input() s3 = {} as S3StateModel;
  @Input() s3meta = {} as S3MetaStateModel;

  @Output() editBucketProps = new EventEmitter<Descriptor>();
  @Output() editFileProps = new EventEmitter<Descriptor>();

  @ViewChild(ContextMenuComponent) contextMenu: ContextMenuComponent;

  descriptorsByPath: { [path: string]: Descriptor[] } = {};
  dictionary: Dictionary[] = [];

  subToActions: Subscription;

  private updateDescriptors: Function;

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
              private dictSvc: DictionaryService,
              private electron: ElectronService,
              private store: Store) {
    super();
    this.updateDescriptors = debounce(this._updateDescriptors, config.s3TreeRefreshThrottle);
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
    return desc
      && (desc.isBucket || desc.isDirectory || (desc.isFile && desc.versioning))
      && !!this.s3[desc.path]
      && (this.s3[desc.path].length === 0);
  }

  /** Is this path expanded? */
  isExpanded(desc: Descriptor): boolean {
    return desc
      && (desc.isBucket || desc.isDirectory || (desc.isFile && desc.versioning))
      && this.view.paths.includes(desc.path)
      && !!this.s3[desc.path];
  }

  /** Is this path expanding? */
  isExpanding(desc: Descriptor): boolean {
    return desc
      && (desc.isBucket || desc.isDirectory || (desc.isFile && desc.versioning))
      && this.view.paths.includes(desc.path)
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

  // event handlers

  onExecute(event: {event?: MouseEvent,
                    item: Descriptor},
            command: string): void {
    const desc = event.item || <Descriptor>{ isDirectory: true, path: this.view.paths[0] };
    switch (command) {
      case 'properties':
        if (desc.isBucket)
          this.editBucketProps.emit(desc);
        else if (desc.isFile || desc.isFileVersion)
          this.editFileProps.emit(desc);
        break;
      case 'url':
        const url = `${this.prefs.endpoints.s3}${config.s3Delimiter}${desc.path}`;
        this.electron.clipboard.writeText(url);
        this.store.dispatch(new Message({ text: `${url} copied to clipboard` }));
        break;
    }
  }

  // bind OnChange handlers

  @OnChange('prefs', 's3', 's3meta', 'view') onChange(): void {
    if (this.prefs && this.s3 && this.s3meta && this.view)
      this.updateDescriptors();
  }

  // private methods

  private _updateDescriptors(): void {
    this.dictionary = this.dictSvc.dictionaryForView(this.view);
    this.view.paths.forEach(path => {
      this.descriptorsByPath[path] =
        this.dictSvc.descriptorsForView(path, 
                                        this.s3, 
                                        this.s3meta, 
                                        this.dictionary, 
                                        this.prefs, 
                                        this.view);
    });
    this.cdf.detectChanges();
  }

} 
