import { BarrelModule } from '../../barrel';
import { ComponentsModule as CommonComponentsModule } from '../../components/module';
import { ComponentsModule as S3ComponentsModule } from './components/module';
import { DictionaryService } from './services/dictionary';
import { NgModule } from '@angular/core';
import { NgxsModule } from '@ngxs/store';
import { PathService } from './services/path';
import { RouterModule } from '@angular/router';
import { Routes } from '@angular/router';
import { S3CtrlComponent } from './ctrl';
import { S3PageComponent } from './page';
import { S3Service } from './services/s3';
import { WatcherService } from './services/watcher';

import { states } from './state/feature';

/**
 * S3 page module
 */

const COMPONENTS = [
  S3CtrlComponent,
  S3PageComponent
];

const MODULES = [
  BarrelModule,
  CommonComponentsModule,
  S3ComponentsModule
];

const ROUTES: Routes = [
  { path: '', component: S3PageComponent }
];

const SERVICES = [
  DictionaryService,
  PathService,
  S3Service,
  WatcherService
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
