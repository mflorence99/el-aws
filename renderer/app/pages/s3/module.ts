import { BarrelModule } from '../../barrel';
import { NgModule } from '@angular/core';
import { S3PageComponent } from './page';
import { S3Service } from './services/s3';

/**
 * S3 page module
 */

const COMPONENTS = [
  S3PageComponent
];

const MODULES = [
  BarrelModule
];

const SERVICES = [
  S3Service
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
  ],

  providers: [
    ...SERVICES
  ]

})

export class S3PageModule { }
