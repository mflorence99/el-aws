import { Actions } from '@ngxs/store';
import { ActivatedRoute } from '@angular/router';
import { AutoUnsubscribe } from 'ellib';
import { ChangeDetectionStrategy } from '@angular/core';
import { ClearSelection } from './state/ddbselection';
import { Component } from '@angular/core';
import { DDBFiltersState } from './state/ddbfilters';
import { DDBFiltersStateModel } from './state/ddbfilters';
import { DDBSchemasState } from './state/ddbschemas';
import { DDBSchemasStateModel } from './state/ddbschemas';
import { DDBSelectionState } from './state/ddbselection';
import { DDBSelectionStateModel } from './state/ddbselection';
import { DDBState } from './state/ddb';
import { DDBStateModel } from './state/ddb';
import { DDBViewsState } from './state/ddbviews';
import { DDBViewsStateModel } from './state/ddbviews';
import { EventEmitter } from '@angular/core';
import { Filter } from './state/ddbfilters';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { LoadTable } from './state/ddb';
import { Navigate } from '@ngxs/router-plugin';
import { Observable } from 'rxjs/Observable';
import { OnChange } from 'ellib';
import { Output } from '@angular/core';
import { ParamMap } from '@angular/router';
import { PrefsState } from '../../state/prefs';
import { PrefsStateModel } from '../../state/prefs';
import { ReloadTable } from './state/ddb';
import { Schema } from './state/ddbschemas';
import { Select } from '@ngxs/store';
import { ShowPagePrefs } from '../../state/window';
import { Store } from '@ngxs/store';
import { Subscription } from 'rxjs/Subscription';
import { UpdateFilter } from './state/ddbfilters';
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
 * Model forms
 */

export type FilterFormGroup = {
  [P in keyof Filter]: any;
};

export interface FilterForm {
  filter: FilterFormGroup;
  submitted: boolean;
  tableName: string;
}

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

  @Input() filterForm = { } as FilterForm;
  @Input() viewAndSchemaForm = { } as ViewAndSchemaForm;

  @Output() openView = new EventEmitter<any>();

  @Select(DDBState) ddb$: Observable<DDBStateModel>;
  @Select(DDBFiltersState) ddbfilters$: Observable<DDBFiltersStateModel>;
  @Select(DDBSchemasState) ddbschemas$: Observable<DDBSchemasStateModel>;
  @Select(DDBViewsState) ddbviews$: Observable<DDBViewsStateModel>;
  @Select(DDBSelectionState) ddbselection$: Observable<DDBSelectionStateModel>;
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

  subToRouteParams: Subscription;
  subToShowPagePrefs: Subscription;

  /** ctor */
  constructor(private actions$: Actions,
              private route: ActivatedRoute,
              private store: Store) {
    super();
    this.handleActions();
    this.handleRouteParams();
  }    

  // bind OnChange handlers

  @OnChange('filterForm') saveFilter(): void {
    if (this.filterForm && this.filterForm.submitted) {
      // TODO: why do we need this in Electron? and only running live?
      // at worst, running in NgZone should work -- but otherwise a DOM
      // event is necessary to force change detection
      nextTick(() => {
        const tableName = this.filterForm.tableName;
        const filter: Filter = { ...this.filterForm.filter };
        this.store.dispatch(new UpdateFilter({ tableName, filter }));
        this.store.dispatch(new ReloadTable());
      });
    }
  }

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

  private handleRouteParams(): void {
    this.subToRouteParams = this.route.paramMap
      .subscribe((params: ParamMap) => {
        const tableName = params.get('tableName');
        // NOTE: if no tableName route param, try latest state
        // we need to rewrite the URL in that case, rather than loading directly
        let table = null;
        if (!tableName) 
          table = this.store.selectSnapshot(DDBState.getTable);
        if (table)
          this.store.dispatch(new Navigate(['/ddb', table.TableName]));
        else this.store.dispatch([new ClearSelection(), new LoadTable({ tableName })]);
      });
  }

}
