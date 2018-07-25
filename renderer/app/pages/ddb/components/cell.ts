import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { Input } from '@angular/core';
import { Scheme } from '../state/ddbschemas';

/**
 * Cellcomponent
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-cell',
  styleUrls: ['cell.scss'],
  templateUrl: 'cell.html'
})

export class CellComponent {

  @Input() row: any = { };
  @Input() scheme = { } as Scheme;

  /** Coerce value to boolean */
  asBoolean(): boolean {
    const value = this.row[this.scheme.column];
    switch (typeof value) {
      case 'boolean':
        return value;
      case 'number':
        return value !== 0;
      case 'string':
        return value.toLowerCase() === 'true';
      default:
        return false;
    }
  }

}
