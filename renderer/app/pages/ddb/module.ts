import { BarrelModule } from '../../barrel';
import { DDBPageComponent } from './page';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Routes } from '@angular/router';

/**
 * DDB page module
 */

const COMPONENTS = [
  DDBPageComponent
];

const MODULES = [
  BarrelModule
];

const ROUTES: Routes = [
  { path: '', component: DDBPageComponent }
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
    RouterModule.forChild(ROUTES)
  ]

})

export class DDBPageModule { }
