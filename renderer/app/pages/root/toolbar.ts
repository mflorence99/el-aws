import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DevTools } from '../../state/window';
import { EventEmitter } from '@angular/core';
import { Output } from '@angular/core';
import { Reload } from '../../state/window';
import { Store } from '@ngxs/store';

/**
 * Toolbar page
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-toolbar',
  styleUrls: ['toolbar.scss'],
  templateUrl: 'toolbar.html'
})

export class ToolbarComponent { 

  @Output() openPrefs = new EventEmitter<any>();

  /** ctor */
  constructor(private store: Store) { }

  /** Open dev tools */
  devTools() {
    this.store.dispatch(new DevTools());
  }

  /** Reload app */
  reload() {
    this.store.dispatch(new Reload());
  }

}
