import { CanActivate } from '@angular/router';
import { CanActivateChild } from '@angular/router';
import { Injectable } from '@angular/core';
import { LoadBuckets } from '../state/s3';
import { LoadDirectory } from '../state/s3';
import { Observable } from 'rxjs';
import { PrefsState } from '../../../state/prefs';
import { PrefsStateModel } from '../../../state/prefs';
import { Select } from '@ngxs/store';
import { Store } from '@ngxs/store';

import { map } from 'rxjs/operators';
import { tap } from 'rxjs/operators';

/**
 * Initialize S3 before loading 
 */

@Injectable()
export class InitGuard implements CanActivate, CanActivateChild {

  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;

  /** ctor */
  constructor(private store: Store) { }

  /** Guard routes that need S3 */
  canActivate(): Observable<boolean> {
    return this._canActivate();
  }

  /** Guard routes that need S3 */
  canActivateChild(): Observable<boolean> {
    return this._canActivate();
  }

  // private methods

  private _canActivate(): Observable<boolean> {
    return this.prefs$
      .pipe(
        tap(prefs => this.store.dispatch(new LoadBuckets())),
        map(prefs => true)
      );
  }

}
