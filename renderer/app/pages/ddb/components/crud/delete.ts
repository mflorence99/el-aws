import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBSelectionStateModel } from '../../state/ddbselection';
import { DDBStateModel } from '../../state/ddb';
import { DrawerPanelComponent } from 'ellib';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
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

  deleteForm: FormGroup;

  /** ctor */
  constructor(private drawerPanel: DrawerPanelComponent,
              private formBuilder: FormBuilder) {
    this.deleteForm = this.formBuilder.group({ });
  }

  /** Close drawer */
  close(): void {
    this.drawerPanel.close();
  }

}
