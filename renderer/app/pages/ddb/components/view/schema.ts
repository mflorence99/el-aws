import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { DDBStateModel } from '../../state/ddb';
import { DictionaryService } from '../../services/dictionary';
import { DrawerPanelComponent } from 'ellib';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { Schema } from '../../state/ddbschemas';
import { SchemaFormGroup } from '../../ctrl';
import { SchemeFormGroup } from '../../ctrl';
import { Validators } from '@angular/forms';
import { View } from '../../state/ddbviews';
import { ViewVisibilityFormGroup } from '../../ctrl';

import { config } from '../../../../config';
import { debounce } from 'ellib';
import { inOutAnimation } from 'ellib';
import { map } from 'rxjs/operators';

/**
 * Schema component
 */

@Component({
  animations: [inOutAnimation()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-view-schema',
  templateUrl: 'schema.html',
  styleUrls: ['schema.scss']
})

export class ViewSchemaComponent extends LifecycleComponent {

  @Input() ddb = { } as DDBStateModel; 
  @Input() ddbschema = { } as Schema; 
  @Input() ddbview = { } as View;

  columns: string[] = [];

  trackColumns: Function;

  viewAndSchemaForm: FormGroup;

  private newStateImpl: Function;

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
              private dictSvc: DictionaryService,
              private drawerPanel: DrawerPanelComponent,
              private formBuilder: FormBuilder) {
    super();
    this.newStateImpl = debounce(this._newStateImpl, config.ddb.schemaRefreshThrottle);
    this.trackColumns = this.trackColumnsImpl.bind(this);
  }

  /** Close drawer */
  close(): void {
    this.drawerPanel.close();
  }

  // bind OnChange handlers

  @OnChange('ddb', 'ddbschema', 'ddbView') newState(): void {
    // NOTE: inhibit form render until we're ready
    this.columns = [];
    if (this.ddb && this.ddb.table && this.ddbschema && this.ddbview) 
      this.newStateImpl();
  }

  // private methods

  private _newStateImpl(): void {
    // all the columns
    this.columns = this.dictSvc.columns(this.ddb, this.ddbschema);
    // create view form controls
    this.viewAndSchemaForm = this.formBuilder.group({
      atLeastOne: [true, Validators.required],
      submitted: false,
      tableName: this.ddb.table.TableName,
      schema: this.formBuilder.group(this.columns.reduce((acc, column) => {
        acc[column] = this.formBuilder.group({
          column: column,
          showAs: this.ddbschema[column].showAs,
          tag: this.ddbschema[column].tag,
          type: this.ddbschema[column].type
        } as SchemeFormGroup);
        return acc;
      }, { } as SchemaFormGroup)),
      visibility: this.formBuilder.group(this.columns.reduce((acc, column) => {
        acc[column] = this.ddbview.visibility[column];
        return acc;
      }, { } as ViewVisibilityFormGroup))
    });
    // make sure at least one visibility
    this.viewAndSchemaForm.get('visibility').valueChanges
      .pipe(
        map(visibility => Object.entries(visibility)),
        map(entries => entries.some(entry => !!entry[1])),
        map(atLeastOne => atLeastOne ? 'atLeastOne' : null)
      ).subscribe(atLeastOne => {
        this.viewAndSchemaForm.get('atLeastOne').setValue(atLeastOne);
      });
    // now we're ready to render form
    this.cdf.detectChanges();
  }

  private trackColumnsImpl(index: number,
                           column: string): string {
    return `${this.ddb.table.TableName}-${column}`;
  }

}
