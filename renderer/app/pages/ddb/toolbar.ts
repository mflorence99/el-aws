import * as DDB from 'aws-sdk/clients/dynamodb';

import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { DDBService } from './services/ddb';
import { DDBState } from './state/ddb';
import { LoadTable } from './state/ddb';
import { OnInit } from '@angular/core';
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

  table: DDB.TableDescription;
  tableNames: string[] = [];

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
              private ddbSvc: DDBService,
              private store: Store) { }

  // event handlers

  onLoadTable(tableName: string): void {
    this.store.dispatch(new LoadTable({ tableName }));
  }

  // lifecycle methods

  ngOnInit(): void {
    this.table = this.store.selectSnapshot(DDBState.getTable);
    this.ddbSvc.listTables(tableNames => {
      this.tableNames = tableNames.sort();
      this.cdf.detectChanges();
    });
  }

}
