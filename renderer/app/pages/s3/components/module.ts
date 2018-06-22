import { BarrelModule } from '../../../barrel';
import { ColumnComponent } from './column';
import { NgModule } from '@angular/core';
import { ViewComponent } from './view';

/**
 * All our components
 */

const COMPONENTS = [
  ColumnComponent,
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
