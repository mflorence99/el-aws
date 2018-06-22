import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';

/**
 * S3 cell component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-cell',
  styleUrls: ['cell.scss'],
  templateUrl: 'cell.html'
})

export class CellComponent { } 
