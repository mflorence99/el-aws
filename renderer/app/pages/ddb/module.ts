import { BarrelModule } from '../../barrel';
import { DDBPageComponent } from './page';
import { NgModule } from '@angular/core';

/**
 * DDB page module
 */

const COMPONENTS = [
  DDBPageComponent
];

const MODULES = [
  BarrelModule
];

@NgModule({

  declarations: [
    ...COMPONENTS
  ],

  exports: [
    DDBPageComponent
  ],

  imports: [
    ...MODULES
  ]

})

export class DDBPageModule { }
