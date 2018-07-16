import { Component } from '@angular/core';
import { DDBService } from './services/ddb';

/**
 * DDB page
 */

@Component({
  selector: 'elaws-ddb-page',
  styleUrls: ['page.scss'],
  templateUrl: 'page.html'
})

export class DDBPageComponent { 

  /** ctor */
  constructor(private ddb: DDBService) {
    this.ddb.listTables(tableNames => {
      tableNames.forEach(tableName => {
        this.ddb.describeTable(tableName, table => {
          console.group({ tableName });
          console.log(JSON.stringify(table));
          console.groupEnd();
        });
      });
    });
  }

}
