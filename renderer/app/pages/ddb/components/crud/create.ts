import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBStateModel } from '../../state/ddb';
import { Input } from '@angular/core';
import { Schema } from '../../state/ddbschemas';

/**
 * CRUD create component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-create',
  templateUrl: 'create.html',
  styleUrls: ['crud.scss']
})

export class CreateComponent {

  @Input() ddb = { } as DDBStateModel;
  @Input() ddbschema = { } as Schema;

}
