import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBStateModel } from '../../state/ddb';
import { Filter } from '../../state/ddbfilters';
import { Input } from '@angular/core';

/**
 * Filter component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-view-filter',
  templateUrl: 'filter.html',
  styleUrls: ['filter.scss']
})

export class ViewFilterComponent {

  @Input() ddb = { } as DDBStateModel; 
  @Input() ddbfilter = { } as Filter;

}
