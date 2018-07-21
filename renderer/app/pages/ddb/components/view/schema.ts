import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBStateModel } from '../../state/ddb';
import { DrawerPanelComponent } from 'ellib';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { Schema } from '../../state/ddbschemas';
import { SchemeFormGroup } from '../../state/ddbschemas';
import { Validators } from '@angular/forms';
import { View } from '../../state/ddbviews';
import { ViewVisibility } from '../../state/ddbviews';

import { map } from 'rxjs/operators';

/**
 * Model combined view and schema form
 */

export interface ViewAndSchemaForm {
  atLeastOne: boolean;
  submitted: boolean;
  tableName: string;
  schema: Schema;
  visibility: ViewVisibility;
}

type ViewAndSchemaFormGroup = {
  [P in keyof ViewAndSchemaForm]: any;
};

/**
 * Schema component
 */

@Component({
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

  viewAndSchemaForm: FormGroup;

  /** ctor */
  constructor(private drawerPanel: DrawerPanelComponent,
              private formBuilder: FormBuilder) {
    super();
  }

  /** Close drawer */
  close(): void {
    this.drawerPanel.close();
  }

  // bind OnChange handlers

  @OnChange('ddb', 'ddbschema', 'ddbView') newSchema(): void {
    if (this.ddb && this.ddbschema && this.ddbview) {
      // all the columns
      this.columns = Object.keys(this.ddbschema).sort((a, b) => {
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });
      // create view form controls
      this.viewAndSchemaForm = this.formBuilder.group({
        atLeastOne: [true, Validators.required],
        submitted: false,
        tableName: this.ddb.table.TableName,
        schema: this.formBuilder.group(this.columns.reduce((acc, column) => {
          acc[column] = this.formBuilder.group({
            showAs: this.ddbschema[column].showAs, 
            tag: this.ddbschema[column].tag,
            type: this.ddbschema[column].type
          } as SchemeFormGroup);
          return acc;
        }, { })),
        visibility: this.formBuilder.group(this.columns.reduce((acc, column) => {
          acc[column] = this.ddbview.visibility[column];
          return acc;
        }, { }))
      } as ViewAndSchemaFormGroup);
      // make sure at least one visibility
      this.viewAndSchemaForm.get('visibility').valueChanges
        .pipe(
          map(visibility => Object.entries(visibility)),
          map(entries => entries.some(entry => !!entry[1])),
          map(atLeastOne => atLeastOne ? 'atLeastOne' : null)
        ).subscribe(atLeastOne => {
          this.viewAndSchemaForm.get('atLeastOne').setValue(atLeastOne);
        });
    }
  }

}
