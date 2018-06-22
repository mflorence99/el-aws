import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';

/**
 * S3 row component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-row',
  styleUrls: ['row.scss'],
  templateUrl: 'row.html'
})

export class RowComponent { } 
