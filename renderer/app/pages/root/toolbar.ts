import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { EventEmitter } from '@angular/core';
import { Output } from '@angular/core';

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
  constructor(private electron: ElectronService) { }

  /** Open dev tools */
  devTools() {
    const win = this.electron.remote.getCurrentWindow();
    win.webContents.openDevTools();
  }

  /** Reload app */
  reload() {
    const win = this.electron.remote.getCurrentWindow();
    win.webContents.reload();
  }

}
