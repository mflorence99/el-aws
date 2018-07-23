import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBStateModel } from '../state/ddb';
import { DictionaryService } from '../services/dictionary';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { PrefsStateModel } from '../../../state/prefs';
import { Schema } from '../state/ddbschemas';
import { Scheme } from '../state/ddbschemas';
import { View } from '../state/ddbviews';

/**
 * Header component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-header',
  styleUrls: ['header.scss'],
  templateUrl: 'header.html'
})

export class HeaderComponent extends LifecycleComponent {

  @Input() ddb = { } as DDBStateModel;
  @Input() ddbschema = { } as Schema;
  @Input() ddbview = { } as View;
  @Input() prefs = { } as PrefsStateModel;

  schemes: Scheme[] = [];

  /** ctor */
  constructor(private dictSvc: DictionaryService) {
    super();
  }

  // bind OnChange handlers

  @OnChange('ddb', 'ddbschema', 'ddbview') newState(): void {
    if (this.ddb && this.ddbschema && this.ddbview)
      this.schemes = this.dictSvc.schemaForView(this.ddb, this.ddbschema, this.ddbview);
  }

}

