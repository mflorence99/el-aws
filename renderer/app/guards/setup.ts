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
 * Guard routes for Initial Setup
 */

@Injectable()
export class SetupGuard implements CanActivate, CanActivateChild, CanNavigate {

  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;

  /** ctor */
  constructor(private store: Store) { }

  /** Guard routes for Setup */
  canActivate(): Observable<boolean> {
    return this._canActivate();
  }

  /** Guard routes for Setup */
  canActivateChild(): Observable<boolean> {
    return this._canActivate();
  }

  /** Guard for navigability */
  canNavigate(): boolean {
    return this.store.selectSnapshot((state: AppState) => !state.prefs.configured);
  }

  // private methods

  private _canActivate(): Observable<boolean> {
    return this.prefs$
      .pipe(
        map(prefs => !prefs.configured)
      );
  }

}
