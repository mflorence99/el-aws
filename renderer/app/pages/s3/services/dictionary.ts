import { BucketMetadata } from '../services/s3';
import { Descriptor } from '../state/s3';
import { Injectable } from '@angular/core';
import { PrefsStateModel } from '../../../state/prefs';
import { S3MetaStateModel } from '../state/s3meta';
import { S3Service } from '../services/s3';
import { S3StateModel } from '../state/s3';
import { S3ViewStateModel } from '../state/s3view';

/**
 * Dictionary of data
 */

export interface Dictionary {
  isDate: boolean;
  isQuantity: boolean;
  isString: boolean;
  name: string;
  showIcon: boolean;
  showMono: boolean;
  tag: string;
  width: number;
}

/**
 * Dictionary service
 */

@Injectable()
export class DictionaryService {

  /** Return the dictionary of all available fields */
  dictionary(): Dictionary[] {
    return [
      { name: 'name', tag: 'Name', isString: true, showIcon: true },
      { name: 'size', tag: 'Size', isQuantity: true },
      { name: 'timestamp', tag: 'Timestamp', isDate: true },
      { name: 'storage', tag: 'Storage', isString: true },
      { name: 'owner', tag: 'Owner', isString: true }
    ] as Dictionary[];
  }

  /** Return the dictionary for a particular view */
  dictionaryForView(view: S3ViewStateModel): Dictionary[] {
    return this.dictionary()
      .filter(entry => view.visibility && view.visibility[entry.name])
      .map(entry => {
        let width = 0;
        if (view.widths && view.widths[entry.name])
          width = view.widths[entry.name];
        return { ...entry, width };
      });
  }

  /** Build descriptors from nodes */
  descriptorsForView(path: string,
                     s3: S3StateModel,
                     s3meta: S3MetaStateModel,
                     dictionary: Dictionary[],
                     prefs: PrefsStateModel,
                     view: S3ViewStateModel): Descriptor[] {
    const descs = this.sort(s3[path] || [], dictionary, prefs, view);
    const { bucket } = S3Service.extractBucketAndPrefix(path);
    descs.forEach(desc => {
      const metadata = <BucketMetadata>s3meta[bucket];
      desc.versioning = metadata 
        && metadata.versioning.Status 
        && (metadata.versioning.Status === 'Enabled');
    });
    return descs;
  }

  // private methods

  private sort(descriptors: Descriptor[],
               dictionary: Dictionary[],
               prefs: PrefsStateModel,
               view: S3ViewStateModel): Descriptor[] {
    if (['first', 'last'].includes(prefs.sortDirectories)) {
      const directories = descriptors.filter(desc => desc.isBucket || desc.isDirectory);
      const files = descriptors.filter(desc => desc.isFile || desc.isFileVersion);
      if (prefs.sortDirectories === 'first')
        descriptors = this.sortImpl(directories, dictionary, view)
          .concat(this.sortImpl(files, dictionary, view));
      else if (prefs.sortDirectories === 'last')
        descriptors = this.sortImpl(files, dictionary, view)
          .concat(this.sortImpl(directories, dictionary, view));
    }
    else this.sortImpl(descriptors, dictionary, view);
    return descriptors;
  }

  private sortImpl(descriptors: Descriptor[],
                   dictionary: Dictionary[],
                   view: S3ViewStateModel): Descriptor[] {
    const entry = dictionary.find(dict => dict.name === view.sortColumn);
    const col = view.sortColumn;
    const dir = view.sortDir;
    return descriptors.sort((a, b) => {
      if ((a[col] == null) && (b[col] == null))
        return 0;
      else if (a[col] == null)
        return -1 * dir;
      else if (b[col] == null)
        return +1 * dir;
      else if (entry.isDate)
        return (a[col].getTime() - b[col].getTime()) * dir;
      else if (entry.isQuantity)
        return (a[col] - b[col]) * dir;
      else if (entry.isString)
        return a[col].toLowerCase().localeCompare(b[col].toLowerCase()) * dir;
      else return 0;
    });
  }

}
