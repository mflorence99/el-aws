import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Component } from '@angular/core';
import { DDBService } from './services/ddb';
import { OnInit } from '@angular/core';

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

  tableNames: string[] = [];

  /** ctor */
  constructor(private cdf: ChangeDetectorRef,
              private ddbSvc: DDBService) { }

  // lifecycle methods

  ngOnInit(): void {
    this.ddbSvc.listTables(tableNames => {
      this.tableNames = tableNames.sort();
      this.cdf.detectChanges();
    });
  }

}
