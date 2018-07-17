import { BarrelModule } from '../../barrel';
import { ComponentsModule as CommonComponentsModule } from '../../components/module';
import { ComponentsModule as DDBComponentsModule } from './components/module';
import { DDBCtrlComponent } from './ctrl';
import { DDBPageComponent } from './page';
import { DDBService } from './services/ddb';
import { NgModule } from '@angular/core';
import { NgxsModule } from '@ngxs/store';
import { RouterModule } from '@angular/router';
import { Routes } from '@angular/router';
import { ToolbarComponent } from './toolbar';

import { states } from './state/feature';

/**
 * DDB page module
 */

const COMPONENTS = [
  DDBCtrlComponent,
  DDBPageComponent,
  ToolbarComponent
];

const MODULES = [
  BarrelModule,
  CommonComponentsModule,
  DDBComponentsModule
];

const ROUTES: Routes = [
  { path: '', component: DDBPageComponent },
  { path: '', component: ToolbarComponent, outlet: 'toolbar' },
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
