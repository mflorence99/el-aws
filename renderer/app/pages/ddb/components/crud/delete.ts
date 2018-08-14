import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBSelectionStateModel } from '../../state/ddbselection';
import { DDBStateModel } from '../../state/ddb';
import { Input } from '@angular/core';

/**
 * CRUD delete component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-delete',
  templateUrl: 'delete.html',
  styleUrls: ['crud.scss']
})

export class DeleteComponent {

  @Input() ddb = { } as DDBStateModel;
  @Input() ddbselection = { } as DDBSelectionStateModel;

}
