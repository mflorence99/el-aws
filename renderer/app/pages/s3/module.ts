import { BarrelModule } from '../../barrel';
import { InitGuard } from './guards/init';
import { NgModule } from '@angular/core';
import { NgxsModule } from '@ngxs/store';
import { RouterModule } from '@angular/router';
import { Routes } from '@angular/router';
import { S3PageComponent } from './page';
import { S3Service } from './services/s3';

import { states } from './state/feature';

/**
 * S3 page module
 */

const COMPONENTS = [
  S3PageComponent
];

const MODULES = [
  BarrelModule
];

const ROUTES: Routes = [
  { path: '', component: S3PageComponent, canActivate: [InitGuard] }
];

const SERVICES = [
  InitGuard,
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
    ...MODULES,
    NgxsModule.forFeature(states),
    RouterModule.forChild(ROUTES),
  ],

  providers: [
    ...SERVICES
  ]

})

export class S3PageModule { }
