import { BarrelModule } from './barrel';
import { DDBPageComponent } from './pages/ddb/page';
import { DDBPageModule } from './pages/ddb/module';
import { EC2PageComponent } from './pages/ec2/page';
import { EC2PageModule } from './pages/ec2/module';
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
import { S3PageComponent } from './pages/s3/page';
import { S3PageModule } from './pages/s3/module';
import { StorageOption } from '@ngxs/storage-plugin';

import { states } from './state/app';

/**
 * el-aws module definition
 */

const COMPONENTS = [ ];

const MODULES = [
  BarrelModule,
  DDBPageModule,
  EC2PageModule,
  NoopPageModule,
  RootPageModule,
  S3PageModule
];

const ROUTES: Routes = [
  {path: '',       component: NoopPageComponent},
  {path: 'ddb',    component: DDBPageComponent},
  {path: 'ec2',    component: EC2PageComponent},
  {path: 's3',     component: S3PageComponent},
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
    NgxsLoggerPluginModule.forRoot({
      collapsed: false,
      logger: console
    }),
    NgxsRouterPluginModule.forRoot(),
    NgxsStoragePluginModule.forRoot({
      key: ['prefs', 'window'],
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
