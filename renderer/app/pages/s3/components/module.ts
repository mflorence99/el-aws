import { BarrelModule } from '../../../barrel';
import { BranchComponent } from './branch';
import { BucketPropsComponent } from './props/bucket';
import { CellComponent } from './cell';
import { ColumnComponent } from './column';
import { FilePropsComponent } from './props/file';
import { NgModule } from '@angular/core';
import { RowComponent } from './row';
import { ViewComponent } from './view';

/**
 * All our components
 */

const COMPONENTS = [
  BranchComponent,
  BucketPropsComponent,
  CellComponent,
  ColumnComponent,
  FilePropsComponent,
  RowComponent,
  ViewComponent
];

@NgModule({

  declarations: [
    ...COMPONENTS
  ],

  exports: [
    ...COMPONENTS
  ],

  imports: [
    BarrelModule
  ]

})

export class ComponentsModule { }
