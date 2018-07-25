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
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { Observable } from 'rxjs/Observable';
import { OnChange } from 'ellib';
import { Output } from '@angular/core';
import { PrefsState } from '../../state/prefs';
import { PrefsStateModel } from '../../state/prefs';
import { ReloadTable } from './state/ddb';
import { Schema } from './state/ddbschemas';
import { Select } from '@ngxs/store';
import { ShowPagePrefs } from '../../state/window';
import { Store } from '@ngxs/store';
import { Subscription } from 'rxjs/Subscription';
import { UpdateSchema } from './state/ddbschemas';
import { UpdateVisibility } from './state/ddbviews';
import { View } from './state/ddbviews';
import { ViewAndSchemaForm } from './components/view/schema';
import { ViewVisibility } from './state/ddbviews';

import { filter } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { nextTick } from 'ellib';
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

  @Input() viewAndSchemaForm = { } as ViewAndSchemaForm;

  @Output() openView = new EventEmitter<any>();

  @Select(DDBState) ddb$: Observable<DDBStateModel>;
  @Select(DDBFiltersState) ddbfilters$: Observable<DDBFiltersStateModel>;
  @Select(DDBSchemasState) ddbschemas$: Observable<DDBSchemasStateModel>;
  @Select(DDBViewsState) ddbviews$: Observable<DDBViewsStateModel>;
  @Select(PrefsState) prefs$: Observable<PrefsStateModel>;

  ddbfilter$: Observable<Filter> = this.ddb$.pipe(
    filter((ddb: DDBStateModel) => !!ddb.table),
    switchMap((ddb: DDBStateModel) => {
      return this.ddbfilters$.pipe(
        map((model: DDBFiltersStateModel) => model[ddb.table.TableName])
      );
    })
  );

  ddbschema$: Observable<Schema> = this.ddb$.pipe(
    filter((ddb: DDBStateModel) => !!ddb.table),
    switchMap((ddb: DDBStateModel) => {
      return this.ddbschemas$.pipe(
        map((model: DDBSchemasStateModel) => model[ddb.table.TableName])
      );
    })
  );

  ddbview$: Observable<View> = this.ddb$.pipe(
    filter((ddb: DDBStateModel) => !!ddb.table),
    switchMap((ddb: DDBStateModel) => {
      return this.ddbviews$.pipe(
        map((model: DDBViewsStateModel) => model[ddb.table.TableName])
      );
    })
  );

  subToShowPagePrefs: Subscription;

  /** ctor */
  constructor(private actions$: Actions,
              private store: Store) {
    super();
    this.handleActions();
  }    

  // bind OnChange handlers

  @OnChange('viewAndSchemaForm') saveViewAndSchema(): void {
    if (this.viewAndSchemaForm && this.viewAndSchemaForm.submitted) {
      // TODO: why do we need this in Electron? and only running live?
      // at worst, running in NgZone should work -- but otherwise a DOM
      // event is necessary to force change detection
      nextTick(() => {
        const tableName = this.viewAndSchemaForm.tableName;
        const visibility: ViewVisibility = { ...this.viewAndSchemaForm.visibility };
        this.store.dispatch(new UpdateVisibility({ tableName, visibility }));
        const schema: Schema = { ...this.viewAndSchemaForm.schema };
        this.store.dispatch(new UpdateSchema({ tableName, schema }));
        this.store.dispatch(new ReloadTable());
      });
    }
  }

  // private methods

  private handleActions(): void {
    // listen for open prefs
    this.subToShowPagePrefs = this.actions$.pipe(ofAction(ShowPagePrefs))
      .subscribe(() => this.openView.emit());
  }

}
