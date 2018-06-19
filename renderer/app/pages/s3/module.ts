import { BarrelModule } from '../../barrel';
import { NgModule } from '@angular/core';
import { S3PageComponent } from './page';

/**
 * S3 page module
 */

const COMPONENTS = [
  S3PageComponent
];

const MODULES = [
  BarrelModule
];

@NgModule({

  declarations: [
    ...COMPONENTS
  ],

  exports: [
    S3PageComponent
  ],

  imports: [
    ...MODULES
  ]

})

export class S3PageModule { }
