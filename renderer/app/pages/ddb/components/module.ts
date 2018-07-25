import { BarrelModule } from '../../../barrel';
import { ColumnComponent } from './column';
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
  ColumnComponent,
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
