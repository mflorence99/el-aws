import { AppState } from '../state/app';
import { CanActivate } from '@angular/router';
import { CanActivateChild } from '@angular/router';
import { CanNavigate } from '../components/navigator';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PrefsState } from '../state/prefs';
import { PrefsStateModel } from '../state/prefs';
import { Select } from '@ngxs/store';
import { Store } from '@ngxs/store';

import { map } from 'rxjs/operators';

/**
 * Guard routes that depend on S3
 */

@Injectable()
export class S3Guard implements CanActivate, CanActivateChild, CanNavigate {

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

  /** Guard for navigability */
  canNavigate(): boolean {
    return this.store.selectSnapshot((state: AppState) => !!state.prefs.endpoints.s3);
  }

  // private methods

  private _canActivate(): Observable<boolean> {
    return this.prefs$
      .pipe(
        map(prefs => !!prefs.endpoints.s3)
      );
  }

}
