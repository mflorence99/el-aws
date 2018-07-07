import { BarrelModule } from '../../barrel';
import { ComponentsModule } from '../../components/module';
import { NgModule } from '@angular/core';
import { SetupComponent } from './setup';
import { SetupCtrlComponent } from './ctrl';
import { SetupPageComponent } from './page';

/**
 * Setup page module
 */

const COMPONENTS = [
  SetupComponent,
  SetupCtrlComponent,
  SetupPageComponent
];

const MODULES = [
  BarrelModule,
  ComponentsModule
];

@NgModule({

  declarations: [
    ...COMPONENTS
  ],

  exports: [
    SetupPageComponent
  ],

  imports: [
    ...MODULES
  ]

})

export class SetupPageModule { }
