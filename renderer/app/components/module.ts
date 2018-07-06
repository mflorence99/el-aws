import { BarrelModule } from '../barrel';
import { KeyValueComponent } from './key-value';
import { NgModule } from '@angular/core';
import { SelectRegionComponent } from './select-region';

/**
 * All our components
 */

const COMPONENTS = [
  KeyValueComponent,
  SelectRegionComponent
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
