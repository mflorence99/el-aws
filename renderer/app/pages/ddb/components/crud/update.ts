import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBSelectionStateModel } from '../../state/ddbselection';
import { DDBStateModel } from '../../state/ddb';
import { Input } from '@angular/core';
import { Schema } from '../../state/ddbschemas';

/**
 * CRUD update component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-update',
  templateUrl: 'update.html',
  styleUrls: ['crud.scss']
})

export class UpdateComponent {

  @Input() ddb = { } as DDBStateModel;
  @Input() ddbschema = { } as Schema;
  @Input() ddbselection = { } as DDBSelectionStateModel;

}
