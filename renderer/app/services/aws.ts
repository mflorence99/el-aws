import { ElectronService } from 'ngx-electron';
import { Injectable } from '@angular/core';

/**
 * AWS service
 */

@Injectable()
export class AWSService {

  /** ctor */
  constructor(private electron: ElectronService) {
    const AWS = this.electron.remote.require('aws-sdk');
    const process = this.electron.process;
    AWS.config.credentials = {
      accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
      secretAccessKey: process.env['AWS_SECRET_KEY'] || process.env['AWS_SECRET_ACCESS_KEY']
    };
    AWS.config.logger = this;
  }

  /** noop */
  init(): void { }

  /** Colorize logging */
  log(msg: string): void {
    try {
      const ix = msg.indexOf(']');
      const hdr = msg.substring(0, ix + 1);
      const color = hdr.includes(' 200 ') ? '#3367d6' : '#c53929';
      const txt = msg.substring(ix + 2);
      console.log(`%c${hdr} %c${txt}`, `color: ${color}; font-weight: bold`, 'color: grey');
    }
    catch (err) {
      console.log(msg);
    }
  }

}
