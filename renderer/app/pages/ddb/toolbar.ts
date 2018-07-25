import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { DDBService } from './services/ddb';
import { DDBState } from './state/ddb';
import { DDBStateModel } from './state/ddb';
import { LoadRows } from './state/ddb';
import { LoadTable } from './state/ddb';
import { Observable } from 'rxjs/Observable';
import { OnInit } from '@angular/core';
import { ReloadTable } from './state/ddb';
import { Select } from '@ngxs/store';
import { Store } from '@ngxs/store';

/**
 * Toolbar component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-toolbar',
  styleUrls: ['toolbar.scss'],
  templateUrl: 'toolbar.html'
})

export class ToolbarComponent implements OnInit { 

  @Select(DDBState) ddb$: Observable<DDBStateModel>;

  tableNames: string[][] = [];

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
              private ddbSvc: DDBService,
              private store: Store) { }

  // event handlers

  loadMoreRows(): void {
    this.store.dispatch(new LoadRows());
  }

  loadTable(tableName: string): void {
    this.store.dispatch(new LoadTable({ tableName }));
  }

  reloadTable(): void {
    this.store.dispatch(new ReloadTable());
  }

  // lifecycle methods

  ngOnInit(): void {
    this.ddbSvc.listTables(tableNames => {
      this.tableNames = tableNames
        .sort()
        // TODO: very specif to our use case -- make more general
        .map(tableName => {
          const ix = tableName.lastIndexOf('.');
          if (ix === -1)
            return [tableName, tableName];
          else return [tableName, tableName.substring(ix + 1)];
        });
      this.cdf.detectChanges();
    });
  }

}
