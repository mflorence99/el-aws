import { AWSService } from './services/aws';
import { BarrelModule } from './barrel';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { ContextMenuModule } from 'ngx-contextmenu';
import { DDBGuard } from './guards/ddb';
import { EC2Guard } from './guards/ec2';
import { NavigatorService } from './services/navigator';
import { NgModule } from '@angular/core';
import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { NgxsModule } from '@ngxs/store';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { NgxsRouterPluginModule } from '@ngxs/router-plugin';
import { NgxsStoragePluginModule } from '@ngxs/storage-plugin';
import { PeriodResolverService } from './services/period-resolver';
import { RootPageComponent } from './pages/root/page';
import { RootPageModule } from './pages/root/module';
import { RouterModule } from '@angular/router';
import { Routes } from '@angular/router';
import { S3Guard } from './guards/s3';
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
  BrowserAnimationsModule,
  BrowserModule,
  RootPageModule,
  SetupPageModule
];

const ROUTES: Routes = [

  { path: '', children: [

    {
      path: 'ddb',    
      loadChildren: './pages/ddb/module#DDBPageModule',    
      canActivate: [DDBGuard]
    },

    {
      path: 'ddb/:tableName',
      loadChildren: './pages/ddb/module#DDBPageModule',
      canActivate: [DDBGuard]
    },

    {
      path: 'ec2',    
      loadChildren: './pages/ec2/module#EC2PageModule',
      canActivate: [EC2Guard],    
    },

    { 
      path: 's3', 
      loadChildren: './pages/s3/module#S3PageModule',    
      canActivate: [S3Guard]
    },

    {
      path: 'setup',  
      component: SetupPageComponent, 
      canActivate: [SetupGuard]
    }

  ]}

];

const SERVICES = [
  AWSService,
  DDBGuard,
  EC2Guard,
  NavigatorService,
  PeriodResolverService,
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
    ContextMenuModule.forRoot({
      autoFocus: true
    }),
    NgxsModule.forRoot(states),
    NgxsLoggerPluginModule.forRoot({
      collapsed: false,
      logger: console
    }),
    NgxsRouterPluginModule.forRoot(),
    NgxsStoragePluginModule.forRoot({
      key: [
        'ddbfilters', 
        'ddbschemas', 
        'ddbviews', 
        'prefs', 
        's3color', 
        's3filter', 
        's3view', 
        'window'
      ],
      storage: StorageOption.LocalStorage
    }),
    NgxsReduxDevtoolsPluginModule.forRoot({disabled: !window['DEV_MODE']}),
    RouterModule.forRoot(ROUTES, { enableTracing: false, useHash: true })
  ],

  providers: [
    ...SERVICES
  ]

})

export class ELAWSModule { }
