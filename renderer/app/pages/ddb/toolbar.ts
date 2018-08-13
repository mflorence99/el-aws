import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { ClearSelection } from './state/ddbselection';
import { Component } from '@angular/core';
import { DDBService } from './services/ddb';
import { DDBState } from './state/ddb';
import { DDBStateModel } from './state/ddb';
import { LoadRows } from './state/ddb';
import { Navigate } from '@ngxs/router-plugin';
import { Observable } from 'rxjs/Observable';
import { OnInit } from '@angular/core';
import { ReloadTable } from './state/ddb';
import { Select } from '@ngxs/store';
import { Store } from '@ngxs/store';

import { config } from '../../config';
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

  maxRowsPerPage = config.ddb.maxRowsPerPage;
  tableNames: string[][] = [];

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
              private ddbSvc: DDBService,
              private store: Store) { }

  // event handlers

  loadMoreRows(): void {
    this.store.dispatch([new ClearSelection(), new LoadRows()]);
  }

  loadTable(tableName: string): void {
    this.store.dispatch(new Navigate(['/ddb', tableName]));
  }

  populateTestTable(): void {
    this.ddbSvc.populate();
  }

  reloadTable(): void {
    this.store.dispatch([new ClearSelection(), new ReloadTable()]);
  }

  // lifecycle methods

  ngOnInit(): void {
    this.ddbSvc.listTables(tableNames => {
      this.tableNames = tableNames
        .sort()
        // TODO: very specific to our use case -- make more general
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
