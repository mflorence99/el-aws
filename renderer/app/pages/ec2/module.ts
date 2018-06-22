import { BarrelModule } from '../../barrel';
import { EC2PageComponent } from './page';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Routes } from '@angular/router';

/**
 * EC2 page module
 */

const COMPONENTS = [
  EC2PageComponent
];

const MODULES = [
  BarrelModule
];

const ROUTES: Routes = [
  { path: '', component: EC2PageComponent }
];

@NgModule({

  declarations: [
    ...COMPONENTS
  ],

  exports: [
    EC2PageComponent
  ],

  imports: [
    ...MODULES,
    RouterModule.forChild(ROUTES)
  ]

})

export class EC2PageModule { }
