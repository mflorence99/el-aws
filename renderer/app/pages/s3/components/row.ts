import { AddPath } from '../state/s3view';
import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { Descriptor } from '../state/s3';
import { Dictionary } from '../services/dictionary';
import { Input } from '@angular/core';
import { PrefsStateModel } from '../../../state/prefs';
import { RemovePath } from '../state/s3view';
import { S3StateModel } from '../state/s3';
import { S3ViewStateModel } from '../state/s3view';
import { Store } from '@ngxs/store';
import { TreeComponent } from '../tree';

/**
 * S3 row component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-row',
  styleUrls: ['row.scss'],
  templateUrl: 'row.html'
})

export class RowComponent { 

  @Input() contextMenu: ContextMenuComponent;
  @Input() desc: Descriptor;
  @Input() dictionary: Dictionary[] = [];
  @Input() hydrated = true;
  @Input() level = 0;
  @Input() path: string;
  @Input() prefs = {} as PrefsStateModel;
  @Input() s3 = {} as S3StateModel;
  @Input() view = {} as S3ViewStateModel;

  /** ctor */
  constructor(private store: Store,
              public tree: TreeComponent) { }

  // event handlers

  onContextMenu(event: MouseEvent,
                desc: Descriptor): void {
    // TODO
    // if the context isn't part of the selection,
    // then it becomes the selection
  }

  onExpand(event: MouseEvent,
          desc: Descriptor): void {
    if (this.view.paths.includes(desc.path))
      this.store.dispatch(new RemovePath({ path: desc.path }));
    else this.store.dispatch(new AddPath({ path: desc.path }));
    event.stopPropagation();
  }

} 
