import { BarrelModule } from './barrel';
import { NgModule } from '@angular/core';
import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { NgxsModule } from '@ngxs/store';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { NgxsRouterPluginModule } from '@ngxs/router-plugin';
import { NgxsStoragePluginModule } from '@ngxs/storage-plugin';
import { NoopPageComponent } from './pages/noop/page';
import { NoopPageModule } from './pages/noop/module';
import { RootPageComponent } from './pages/root/page';
import { RootPageModule } from './pages/root/module';
import { RouterModule } from '@angular/router';
import { Routes } from '@angular/router';
import { StorageOption } from '@ngxs/storage-plugin';

import { states } from './state/app';

/**
 * el-aws module definition
 */

const COMPONENTS = [ ];

const MODULES = [
  BarrelModule,
  NoopPageModule,
  RootPageModule
];

const ROUTES: Routes = [
  {path: '',       component: NoopPageComponent},
  {path: '**',     component: NoopPageComponent}
];

const SERVICES = [
];

@NgModule({

  bootstrap: [RootPageComponent],

  declarations: [
    ...COMPONENTS
  ],

  imports: [
    ...MODULES,
    NgxsModule.forRoot(states),
    NgxsRouterPluginModule.forRoot(),
    NgxsLoggerPluginModule.forRoot({
      collapsed: false,
      logger: console
    }),
    NgxsStoragePluginModule.forRoot({
      key: ['route'],
      storage: StorageOption.LocalStorage
    }),
    NgxsReduxDevtoolsPluginModule.forRoot({disabled: !window['DEV_MODE']}),
    RouterModule.forRoot(ROUTES)
  ],

  providers: [
    ...SERVICES
  ]

})

export class ELAWSModule { }
