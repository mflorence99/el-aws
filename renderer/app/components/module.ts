import { BarrelModule } from '../barrel';
import { KeyValueComponent } from './key-value';
import { NgModule } from '@angular/core';

/**
 * All our components
 */

const COMPONENTS = [
  KeyValueComponent
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
