import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Watcher service
 * 
 * TODO: we'd like this to be like a real stream, but we get by with a manual "touch"
 */

@Injectable()
export class WatcherService {

  stream$ = new Subject<string>();
  
  private watched: { [path: string]: boolean } = { };

  /** Touch a path */
  touch(path: string): void {
    if (this.watched[path])
      this.stream$.next(path);
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
