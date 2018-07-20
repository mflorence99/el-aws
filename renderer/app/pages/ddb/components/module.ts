import { BarrelModule } from '../../../barrel';
import { ComponentsModule as CommonComponentsModule } from '../../../components/module';
import { NgModule } from '@angular/core';
import { SelectTableComponent } from './select-table';
import { ViewComponent } from './view';
import { ViewFilterComponent } from './view/filter';
import { ViewSchemaComponent } from './view/schema';

/**
 * All our components
 */

const COMPONENTS = [
  SelectTableComponent,
  ViewComponent,
  ViewFilterComponent,
  ViewSchemaComponent
];

@NgModule({

  declarations: [
    ...COMPONENTS
  ],

  exports: [
    ...COMPONENTS
  ],

  imports: [
    BarrelModule,
    CommonComponentsModule
  ]

})

export class ComponentsModule { }
