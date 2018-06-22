import { BarrelModule } from '../../../barrel';
import { BranchComponent } from './branch';
import { CellComponent } from './cell';
import { ColumnComponent } from './column';
import { NgModule } from '@angular/core';
import { RowComponent } from './row';
import { ViewComponent } from './view';

/**
 * All our components
 */

const COMPONENTS = [
  BranchComponent,
  CellComponent,
  ColumnComponent,
  RowComponent,
  ViewComponent
];

@NgModule({

  declarations: [
    ...COMPONENTS
  ],

  exports: [
    ...COMPONENTS
  ],

  imports: [
    BarrelModule
  ]

})

export class ComponentsModule { }
