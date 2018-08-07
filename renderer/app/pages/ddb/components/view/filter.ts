import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { DDBStateModel } from '../../state/ddb';
import { DictionaryService } from '../../services/dictionary';
import { DrawerPanelComponent } from 'ellib';
import { Filter } from '../../state/ddbfilters';
import { FilterExpressionFormGroup } from '../../state/ddbfilters';
import { FilterFormGroup } from '../../ctrl';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { Schema } from '../../state/ddbschemas';

import { config } from '../../../../config';
import { debounce } from 'ellib';
import { inOutAnimation } from 'ellib';
import { nullSafe } from 'ellib';

/**
 * Model combined filter form
 */

/**
 * Filter component
 */

@Component({
  animations: [inOutAnimation()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-view-filter',
  templateUrl: 'filter.html',
  styleUrls: ['filter.scss']
})

export class ViewFilterComponent extends LifecycleComponent {

  @Input() ddb = { } as DDBStateModel; 
  @Input() ddbfilter = { } as Filter;
  @Input() ddbschema = { } as Schema; 

  columns: string[] = [];

  filterForm: FormGroup;

  trackColumns: Function;

  private newStateImpl: Function;

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
              private dictSvc: DictionaryService,
              private drawerPanel: DrawerPanelComponent,
              private formBuilder: FormBuilder) {
    super();
    this.newStateImpl = debounce(this._newStateImpl, config.ddb.filterRefreshThrottle);
    this.trackColumns = this.trackColumnsImpl.bind(this);
  }

  /** Clear comparand */
  clearComparand(column: string): void {
    this.filterForm.patchValue({ filter: { [column]: { comparand: '' } } });
  }

  /** Clear comparand */
  clearComparand2(column: string): void {
    this.filterForm.patchValue({ filter: { [column]: { comparand2: '' } } });
  }

  /** Close drawer */
  close(): void {
    this.drawerPanel.close();
  }

  // bind OnChange handlers

  @OnChange('ddb', 'ddbfilter', 'ddbschema') newState(): void {
    // NOTE: inhibit form render until we're ready
    this.columns = [];
    if (this.ddb && this.ddb.table && this.ddbfilter && this.ddbschema)
      this.newStateImpl();
  }

  // private methods

  private _newStateImpl(): void {
    // all the columns
    this.columns = this.dictSvc.columns(this.ddb, this.ddbschema, true /* onlyFilterable */);
    // create view form controls
    this.filterForm = this.formBuilder.group({
      tableName: this.ddb.table.TableName,
      filter: this.formBuilder.group(this.columns.reduce((acc, column) => {
        acc[column] = this.formBuilder.group({
          column: column,
          comparand: nullSafe(this.ddbfilter[column], 'comparand'),
          comparand2: { 
            value: nullSafe(this.ddbfilter[column], 'comparand2'), 
            disabled: !nullSafe(this.ddbfilter[column], 'comparand') 
          }
        } as FilterExpressionFormGroup);
        return acc;
      }, { } as FilterFormGroup))
    });
    // now we're ready to render form
    this.cdf.detectChanges();
  }

  private trackColumnsImpl(index: number,
                           column: string): string {
    return `${this.ddb.table.TableName}-${column}`;
  }

}
