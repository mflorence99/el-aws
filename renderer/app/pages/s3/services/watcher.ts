import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs';

import { concatMap } from 'rxjs/operators';
import { config } from '../../../config';
import { distinctUntilChanged } from 'rxjs/operators';
import { windowTime } from 'rxjs/operators';
/**
 * Watcher service
 * 
 * TODO: we'd like this to be like a real stream, but we get by with a manual "touch"
 */

@Injectable()
export class WatcherService {

  stream$: Observable<string>;
  
  private watched: { [path: string]: boolean } = { };
  private watcher$: Subject<string>;

  /** ctor */
  constructor() {
    this.watcher$ = new Subject<string>();
    // @see https://stackoverflow.com/questions/50928751/rxjs-distinctuntilchanged-with-timer
    this.stream$ = this.watcher$.pipe(
      windowTime(config.s3.watcherThrottle),
      concatMap(obs => obs.pipe(
        distinctUntilChanged()
      ))
    );
  }

  /** Touch a path */
  touch(path: string): void {
    if (this.watched[path])
      this.watcher$.next(path);
  }

  /** Stop watchin a path */
  unwatch(path: string): void {
    delete this.watched[path];
  }

  /** Watch a path */
  watch(path: string): void {
    this.watched[path] = true;
  }

}
