import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { Descriptor } from '../state/s3';
import { Dictionary } from '../services/dictionary';
import { Input } from '@angular/core';
import { LoadDirectory } from '../state/s3';
import { OnInit } from '@angular/core';
import { PrefsStateModel } from '../../../state/prefs';
import { S3FilterStateModel } from '../state/s3filter';
import { S3SelectionStateModel } from '../state/s3selection';
import { S3StateModel } from '../state/s3';
import { S3ViewStateModel } from '../state/s3view';
import { Store } from '@ngxs/store';
import { TreeComponent } from './tree';
import { UpdatePathLRU } from '../state/s3view';

/**
 * S3 branch component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-branch',
  styleUrls: ['branch.scss'],
  templateUrl: 'branch.html'
})

export class BranchComponent implements OnInit { 

  @Input() contextMenu: ContextMenuComponent;
  @Input() descriptorsByPath: { [path: string]: Descriptor[] } = {};
  @Input() dictionary: Dictionary[] = [];
  @Input() s3 = {} as S3StateModel;
  @Input() s3filter = {} as S3FilterStateModel;
  @Input() level = 0;
  @Input() path: string;
  @Input() prefs = {} as PrefsStateModel;
  @Input() selection = {} as S3SelectionStateModel;
  @Input() view = {} as S3ViewStateModel;

  /** ctor */
  constructor(private store: Store,
              public tree: TreeComponent) { }

  // lifecycle methods

  ngOnInit(): void {
    this.store.dispatch([
      new LoadDirectory({ path: this.path }),
      new UpdatePathLRU({ path: this.path })
    ]);
  }

} 
