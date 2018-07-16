import { BarrelModule } from '../../barrel';
import { ComponentsModule as CommonComponentsModule } from '../../components/module';
import { DDBPageComponent } from './page';
import { DDBService } from './services/ddb';
import { NgModule } from '@angular/core';
import { NgxsModule } from '@ngxs/store';
import { RouterModule } from '@angular/router';
import { Routes } from '@angular/router';

import { states } from './state/feature';

/**
 * DDB page module
 */

const COMPONENTS = [
  DDBPageComponent
];

const MODULES = [
  BarrelModule,
  CommonComponentsModule
];

const ROUTES: Routes = [
  { path: '', component: DDBPageComponent }
];

const SERVICES = [
  DDBService
];

@NgModule({

  declarations: [
    ...COMPONENTS
  ],

  exports: [
    DDBPageComponent
  ],

  imports: [
    ...MODULES,
    NgxsModule.forFeature(states),
    RouterModule.forChild(ROUTES)
  ],

  providers: [
    ...SERVICES
  ]

})

export class DDBPageModule { }
