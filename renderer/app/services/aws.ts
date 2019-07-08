import { ElectronService } from 'ngx-electron';
import { Injectable } from '@angular/core';

import { config } from 'aws-sdk';

declare var AWS: any;

/**
 * AWS service
 * 
 * TODO: we are currently working mixed-mode: some components use the AWS browser
 * API, others the Node.js API
 */

@Injectable()
export class AWSService {

  /** ctor */
  constructor(private electron: ElectronService) { }

  /** Initialize AWS */
  init(): void { 
    // TODO: monkey-patch browser so we can use environment-supplied auth
    AWS.util.isBrowser = () => true;
    const process = this.electron.process;
    config.update({
      accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
      secretAccessKey: process.env['AWS_SECRET_KEY'] || process.env['AWS_SECRET_ACCESS_KEY']
    });
    // now set credentials for Node.js
    this.electron.remote.require('aws-sdk').config.update({
      accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
      secretAccessKey: process.env['AWS_SECRET_KEY'] || process.env['AWS_SECRET_ACCESS_KEY']
    });
  }

}
