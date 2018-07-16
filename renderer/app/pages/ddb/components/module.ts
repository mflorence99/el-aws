import { BarrelModule } from '../../../barrel';
import { ComponentsModule as CommonComponentsModule } from '../../../components/module';
import { NgModule } from '@angular/core';
import { SelectTableComponent } from './select-table';

/**
 * All our components
 */

const COMPONENTS = [
  SelectTableComponent
];

@NgModule({

  declarations: [
    ...COMPONENTS
  ],

  exports: [
    ...COMPONENTS
  ],

  imports: [
    BarrelModule,
    CommonComponentsModule
  ]

})

export class ComponentsModule { }
