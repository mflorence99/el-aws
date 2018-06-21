import { BarrelModule } from './barrel';
import { DDBGuard } from './guards/ddb';
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
import { RootPageComponent } from './pages/root/page';
import { RootPageModule } from './pages/root/module';
import { RouterModule } from '@angular/router';
import { Routes } from '@angular/router';
import { S3Guard } from './guards/s3';
import { S3PageComponent } from './pages/s3/page';
import { S3PageModule } from './pages/s3/module';
import { SetupGuard } from './guards/setup';
import { SetupPageComponent } from './pages/setup/page';
import { SetupPageModule } from './pages/setup/module';
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
  RootPageModule,
  S3PageModule,
  SetupPageModule
];

const ROUTES: Routes = [
  {path: 'ddb',    component: DDBPageComponent,   canActivate: [DDBGuard]},
  {path: 'ec2',    component: EC2PageComponent},
  {path: 's3',     component: S3PageComponent,    canActivate: [S3Guard]},
  {path: 'setup',  component: SetupPageComponent, canActivate: [SetupGuard]}
];

const SERVICES = [
  DDBGuard,
  S3Guard,
  SetupGuard
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
