import { Actions } from '@ngxs/store';
import { AutoUnsubscribe } from 'ellib';
import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBFiltersState } from './state/ddbfilters';
import { DDBFiltersStateModel } from './state/ddbfilters';
import { DDBSchemasState } from './state/ddbschemas';
import { DDBSchemasStateModel } from './state/ddbschemas';
import { DDBState } from './state/ddb';
import { DDBStateModel } from './state/ddb';
import { DDBViewsState } from './state/ddbviews';
import { DDBViewsStateModel } from './state/ddbviews';
import { EventEmitter } from '@angular/core';
import { Filter } from './state/ddbfilters';
import { LifecycleComponent } from 'ellib';
import { Observable } from 'rxjs/Observable';
import { Output } from '@angular/core';
import { PrefsState } from '../../state/prefs';
import { PrefsStateModel } from '../../state/prefs';
import { Schema } from './state/ddbschemas';
import { Select } from '@ngxs/store';
import { ShowPagePrefs } from '../../state/window';
import { Subscription } from 'rxjs/Subscription';
import { View } from './state/ddbviews';

import { map } from 'rxjs/operators';
import { ofAction } from '@ngxs/store';
import { switchMap } from 'rxjs/operators';

/**
 * DDB controller
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-ddb-ctrl',
  styles: [':host { display: none; }'],
  template: ''
})

@AutoUnsubscribe()
export class DDBCtrlComponent extends LifecycleComponent {

  @Output() openView = new EventEmitter<any>();

  @Select(DDBState) ddb$: Observable<DDBStateModel>;
  @Select(DDBFiltersState) ddbfilters$: Observable<DDBFiltersStateModel>;
  @Select(DDBSchemasState) ddbschemas$: Observable<DDBSchemasStateModel>;
  @Select(DDBViewsState) ddbviews$: Observable<DDBViewsStateModel>;
  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;

  ddbfilter$: Observable<Filter> = this.ddb$.pipe(
    switchMap((ddb: DDBStateModel) => {
      return this.ddbfilters$.pipe(
        map((model: DDBFiltersStateModel) => model[ddb.table.TableName])
      );
    })
  );

  ddbschema$: Observable<Schema> = this.ddb$.pipe(
    switchMap((ddb: DDBStateModel) => {
      return this.ddbschemas$.pipe(
        map((model: DDBSchemasStateModel) => model[ddb.table.TableName])
      );
    })
  );

  ddbview$: Observable<View> = this.ddb$.pipe(
    switchMap((ddb: DDBStateModel) => {
      return this.ddbviews$.pipe(
        map((model: DDBViewsStateModel) => model[ddb.table.TableName])
      );
    })
  );

  subToShowPagePrefs: Subscription;

  /** ctor */
  constructor(private actions$: Actions) {
    super();
    this.handleActions();
  }    

  // private methods

  private handleActions(): void {
    // listen for open prefs
    this.subToShowPagePrefs = this.actions$.pipe(ofAction(ShowPagePrefs))
      .subscribe(() => this.openView.emit());
  }

}
