import { BarrelModule } from '../../barrel';
import { EC2PageComponent } from './page';
import { NgModule } from '@angular/core';

/**
 * EC2 page module
 */

const COMPONENTS = [
  EC2PageComponent
];

const MODULES = [
  BarrelModule
];

@NgModule({

  declarations: [
    ...COMPONENTS
  ],

  exports: [
    EC2PageComponent
  ],

  imports: [
    ...MODULES
  ]

})

export class EC2PageModule { }
