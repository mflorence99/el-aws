import { Injectable } from '@angular/core';

/**
 * Abstract Navigator definition
 */

export interface Navigator {
  // TODO: why doesn't this work?
  // canNavigate?: CanActivate[];
  // well -- I'm not going to worry about it because the Angular team has to
  // do exactly the same in interface Route
  // @see https://github.com/angular/angular/blob/master/packages/router/src/config.ts
  canNavigate?: any[];
  color: string;
  icon: string[];
  route: string;
  title: string;
}

/**
 * Navigator service
 * 
 * NOTE: placeholder for now
 */

@Injectable()
export class NavigatorService {

}
