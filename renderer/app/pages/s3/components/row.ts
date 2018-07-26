import { AddPath } from '../state/s3view';
import { AddPathToSelection } from '../state/s3selection';
import { ChangeDetectionStrategy } from '@angular/core';
import { ClearSelection } from '../state/s3selection';
import { Component } from '@angular/core';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { Descriptor } from '../state/s3';
import { Dictionary } from '../services/dictionary';
import { Input } from '@angular/core';
import { LoadDirectory } from '../state/s3';
import { PrefsStateModel } from '../../../state/prefs';
import { RemovePath } from '../state/s3view';
import { ReplacePathsInSelection } from '../state/s3selection';
import { S3Filter } from '../state/s3filter';
import { S3SelectionStateModel } from '../state/s3selection';
import { S3ViewStateModel } from '../state/s3view';
import { Store } from '@ngxs/store';
import { TogglePathInSelection } from '../state/s3selection';
import { TreeComponent } from './tree';

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
  @Input() filter = { } as S3Filter;
  @Input() hydrated = true;
  @Input() level = 0;
  @Input() path: string;
  @Input() prefs = { } as PrefsStateModel;
  @Input() s3selection = { } as S3SelectionStateModel;
  @Input() s3view = { } as S3ViewStateModel;

  /** ctor */
  constructor(private store: Store,
              public tree: TreeComponent) { }

  // event handlers

  onContextMenu(event: MouseEvent,
                desc: Descriptor): void {
    // if the context isn't part of the selection,
    // then it becomes the selection
    if (!this.s3selection.paths.includes(desc.path)) {
      this.store.dispatch([
        new ClearSelection(),
        new AddPathToSelection({ path: desc.path })
      ]);
    }
  }

  onExpand(event: MouseEvent,
          desc: Descriptor): void {
    if (this.s3view.paths.includes(desc.path))
      this.store.dispatch(new RemovePath({ path: desc.path }));
    else {
      this.store.dispatch([
        new AddPath({ path: desc.path }),
        new LoadDirectory({ path: desc.path })
      ]);
    }
    event.stopPropagation();
  }

  onSelect(event: MouseEvent,
           desc: Descriptor): void {
    const actions = [];
    if (event.shiftKey) {
      if (this.s3selection.paths.length === 0)
        actions.push(new AddPathToSelection({ path: desc.path }));
      else {
        // get all visible paths, in order
        const paths = Array.from(document.querySelectorAll('elaws-row'))
          .map(row => row.getAttribute('path'))
          .reduce((acc, path) => {
            acc.push(path);
            return acc;
          }, []);
        // find indexes of newly-selected path, and current selection boundaries
        const ix = paths.indexOf(desc.path);
        let lo = Number.MAX_SAFE_INTEGER;
        let hi = Number.MIN_SAFE_INTEGER;
        this.s3selection.paths.forEach(path => {
          lo = Math.min(lo, paths.indexOf(path));
          hi = Math.max(hi, paths.indexOf(path));
        });
        // extend/contract the selection appropriately
        if (ix < lo)
          lo = ix;
        else if (ix > hi)
          hi = ix;
        else hi = ix;
        actions.push(new ReplacePathsInSelection({ paths: paths.slice(lo, hi + 1) }));
      }
    }
    else if (event.ctrlKey)
      actions.push(new TogglePathInSelection({ path: desc.path }));
    else {
      actions.push(new ClearSelection());
      actions.push(new AddPathToSelection({ path: desc.path }));
    }
    if (actions.length > 0)
      this.store.dispatch(actions);
  }

} 
