import { AlertComponent } from './alert';
import { BarrelModule } from '../../barrel';
import { ComponentsModule } from '../../components/module';
import { NgModule } from '@angular/core';
import { PrefsComponent } from './prefs';
import { RootCtrlComponent } from './ctrl';
import { RootPageComponent } from './page';
import { StatusbarComponent } from './statusbar';
import { TabsComponent } from './tabs';
import { ToolbarComponent } from './toolbar';

import { fab } from '@fortawesome/free-brands-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { library as fontAwesome } from '@fortawesome/fontawesome-svg-core';

fontAwesome.add(fab, far, fas);

/**
 * Root page module
 */

const COMPONENTS = [
  AlertComponent,
  PrefsComponent,
  RootCtrlComponent,
  RootPageComponent,
  StatusbarComponent,
  TabsComponent,
  ToolbarComponent
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
    RootPageComponent
  ],

  imports: [
    ...MODULES
  ]

})

export class RootPageModule { }
