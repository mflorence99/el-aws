import { BarrelModule } from '../../barrel';
import { ComponentsModule } from './components/module';
import { DictionaryService } from './services/dictionary';
import { HeaderComponent } from './header';
import { InitGuard } from './guards/init';
import { NgModule } from '@angular/core';
import { NgxsModule } from '@ngxs/store';
import { RouterModule } from '@angular/router';
import { Routes } from '@angular/router';
import { S3CtrlComponent } from './ctrl';
import { S3PageComponent } from './page';
import { S3Service } from './services/s3';
import { TreeComponent } from './tree';

import { states } from './state/feature';

/**
 * S3 page module
 */

const COMPONENTS = [
  HeaderComponent,
  S3CtrlComponent,
  S3PageComponent,
  TreeComponent
];

const MODULES = [
  BarrelModule,
  ComponentsModule
];

const ROUTES: Routes = [
  { path: '', component: S3PageComponent, canActivate: [InitGuard] }
];

const SERVICES = [
  DictionaryService,
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
