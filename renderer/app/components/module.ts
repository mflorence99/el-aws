import { BarrelModule } from '../barrel';
import { KeyValueComponent } from './key-value';
import { NgModule } from '@angular/core';
import { SelectPeriodComponent } from './select-period';
import { SelectRegionComponent } from './select-region';

/**
 * All our components
 */

const COMPONENTS = [
  KeyValueComponent,
  SelectPeriodComponent,
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
