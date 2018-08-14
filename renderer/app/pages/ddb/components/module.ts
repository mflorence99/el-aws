import { BarrelModule } from '../../../barrel';
import { CellComponent } from './cell';
import { ComponentsModule as CommonComponentsModule } from '../../../components/module';
import { CreateComponent } from './crud/create';
import { DeleteComponent } from './crud/delete';
import { HeaderComponent } from './header';
import { NgModule } from '@angular/core';
import { PaneComponent } from './pane';
import { SelectTableComponent } from './select-table';
import { TableComponent } from './table';
import { UpdateComponent } from './crud/update';
import { ViewComponent } from './view';
import { ViewFilterComponent } from './view/filter';
import { ViewSchemaComponent } from './view/schema';

/**
 * All our components
 */

const COMPONENTS = [
  CellComponent,
  CreateComponent,
  DeleteComponent,
  HeaderComponent,
  PaneComponent,
  SelectTableComponent,
  TableComponent,
  UpdateComponent,
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
