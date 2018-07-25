import { BarrelModule } from '../../../barrel';
import { CellComponent } from './cell';
import { ComponentsModule as CommonComponentsModule } from '../../../components/module';
import { HeaderComponent } from './header';
import { NgModule } from '@angular/core';
import { PaneComponent } from './pane';
import { SelectTableComponent } from './select-table';
import { TableComponent } from './table';
import { ViewComponent } from './view';
import { ViewFilterComponent } from './view/filter';
import { ViewSchemaComponent } from './view/schema';

/**
 * All our components
 */

const COMPONENTS = [
  CellComponent,
  HeaderComponent,
  PaneComponent,
  SelectTableComponent,
  TableComponent,
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
