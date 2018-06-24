import { CanActivate } from '@angular/router';
import { CanActivateChild } from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PrefsState } from '../state/prefs';
import { PrefsStateModel } from '../state/prefs';
import { Select } from '@ngxs/store';

import { map } from 'rxjs/operators';

/**
 * Guard routes that depend on EC2
 */

@Injectable()
export class EC2Guard implements CanActivate, CanActivateChild {

  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;

  /** Guard routes that need EC2 */
  canActivate(): Observable<boolean> {
    return this._canActivate();
  }

  /** Guard routes that need EC2 */
  canActivateChild(): Observable<boolean> {
    return this._canActivate();
  }

  // private methods

  private _canActivate(): Observable<boolean> {
    return this.prefs$
      .pipe(
        map(prefs => !!prefs.endpoints.ec2)
      );
  }

}
