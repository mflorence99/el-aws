import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBState } from '../state/ddb';
import { Filter } from '../state/ddbfilters';
import { Input } from '@angular/core';
import { Schema } from '../state/ddbschemas';
import { View } from '../state/ddbviews';
import { ViewChild } from '@angular/core';
import { ViewFilterComponent } from './view/filter';
import { ViewSchemaComponent } from './view/schema';

/**
 * View component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-view',
  templateUrl: 'view.html',
  styleUrls: ['view.scss']
})

export class ViewComponent {

  @Input() ddb = { } as DDBState;
  @Input() ddbfilter = { } as Filter;
  @Input() ddbschema = { } as Schema;
  @Input() ddbview = { } as View;

  @ViewChild(ViewFilterComponent) filter;
  @ViewChild(ViewSchemaComponent) schema;

}
