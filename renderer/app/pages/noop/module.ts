import { BarrelModule } from '../../barrel';
import { NgModule } from '@angular/core';
import { NoopPageComponent } from './page';

/**
 * Noop page module
 */

const COMPONENTS = [
  NoopPageComponent
];

const MODULES = [
  BarrelModule
];

@NgModule({

  declarations: [
    ...COMPONENTS
  ],

  exports: [
    NoopPageComponent
  ],

  imports: [
    ...MODULES
  ]

})

export class NoopPageModule { }
