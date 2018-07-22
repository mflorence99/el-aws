import { Descriptor } from '../state/s3';
import { Injectable } from '@angular/core';
import { PrefsStateModel } from '../../../state/prefs';
import { S3StateModel } from '../state/s3';
import { S3ViewStateModel } from '../state/s3view';

/**
 * Dictionary of data
 */

export interface Dictionary {
  isDate?: boolean;
  isQuantity?: boolean;
  isString?: boolean;
  name: string;
  showIcon?: boolean;
  showMono?: boolean;
  tag: string;
  width?: number;
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
    ];
  }

  /** Return the dictionary for a particular s3view */
  dictionaryForView(s3view: S3ViewStateModel): Dictionary[] {
    return this.dictionary()
      .filter(entry => s3view.visibility && s3view.visibility[entry.name])
      .map(entry => {
        let width = 0;
        if (s3view.widths && s3view.widths[entry.name])
          width = s3view.widths[entry.name];
        return { ...entry, width };
      });
  }

  /** Build descriptors from nodes */
  descriptorsForView(path: string,
                     s3: S3StateModel,
                     dictionary: Dictionary[],
                     prefs: PrefsStateModel,
                     s3view: S3ViewStateModel): Descriptor[] {
    return this.sort(s3[path] || [], dictionary, prefs, s3view);
  }

  // private methods

  private sort(descriptors: Descriptor[],
               dictionary: Dictionary[],
               prefs: PrefsStateModel,
               s3view: S3ViewStateModel): Descriptor[] {
    if (['first', 'last'].includes(prefs.sortDirectories)) {
      const directories = descriptors.filter(desc => desc.isBucket || desc.isDirectory);
      const files = descriptors.filter(desc => desc.isFile || desc.isFileVersion);
      if (prefs.sortDirectories === 'first')
        descriptors = this.sortImpl(directories, dictionary, s3view)
          .concat(this.sortImpl(files, dictionary, s3view));
      else if (prefs.sortDirectories === 'last')
        descriptors = this.sortImpl(files, dictionary, s3view)
          .concat(this.sortImpl(directories, dictionary, s3view));
    }
    else this.sortImpl(descriptors, dictionary, s3view);
    return descriptors;
  }

  private sortImpl(descriptors: Descriptor[],
                   dictionary: Dictionary[],
                   s3view: S3ViewStateModel): Descriptor[] {
    const entry = dictionary.find(dict => dict.name === s3view.sortColumn);
    const col = s3view.sortColumn;
    const dir = s3view.sortDir;
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
