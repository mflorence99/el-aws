import { Injectable } from '@angular/core';

import { config } from '../../../config';

/**
 * Model path information
 */

export interface PathInfo {
  bucket: string;
  directory: string;
  filename: string;
  isBucket: boolean;
  isDirectory: boolean;
  isFile: boolean;
  isFileVersion: boolean;
  isRoot: boolean;
  parent: string;
  prefix: string;
  version: string;
}

/**
 * S3 path service
 */

@Injectable()
export class PathService {

  /** 
   * Analyze a path and return its components 
   * 
   * NOTE: bucket/dir/dir/filename?versionid=version
   */
  analyze(path: string): PathInfo {
    const info = { } as PathInfo;
    // special case: root path
    if (!path || (path === config.s3.delimiter)) {
      info.isDirectory = true;
      info.isRoot = true;
      info.directory = config.s3.delimiter;
    }
    else {
      // eliminate any initial /
      if (path.startsWith(config.s3.delimiter))
        path = path.substring(1);
      // extract any version
      const param = '?versionid=';
      let ix = path.indexOf(param);
      if (ix !== -1) {
        info.version = path.substring(ix + param.length);
        info.isFileVersion = true;
        path = path.substring(0, ix);
      }
      // split around / into parts
      ix = path.indexOf(config.s3.delimiter);
      if (ix === -1) {
        info.bucket = path;
        info.isBucket = true;
      }
      else {
        info.bucket = path.substring(0, ix);
        info.prefix = path.substring(ix + 1);
        // just a directory
        if (path.endsWith(config.s3.delimiter)) {
          info.isDirectory = true;
          info.directory = path;
          if (!info.prefix) 
            info.isBucket = true;
          else {
            ix = path.substring(0, path.length - 1).lastIndexOf(config.s3.delimiter);
            if (ix === -1)
              info.parent = info.bucket + config.s3.delimiter;
            else info.parent = path.substring(0, ix + 1);
          }
        }
        // or a file
        else {
          info.isFile = true;
          ix = path.lastIndexOf(config.s3.delimiter);
          info.directory = path.substring(0, ix + 1);
          info.filename = path.substring(ix + 1);
          info.parent = info.isFileVersion? path : info.directory;
        }
      }
    }
    return info;
  }

}
