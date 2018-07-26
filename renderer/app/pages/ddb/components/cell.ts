import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { Input } from '@angular/core';
import { PrefsStateModel } from '../../../state/prefs';
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

  @Input() prefs = { } as PrefsStateModel;
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

  /** Coerce value to date */
  asDate(): Date {
    const date = new Date(this.row[this.scheme.column]);
    return (date.toString() === 'Invalid Date')? null : date;
  }

  /** Coerce value to number */
  asNumber(): number {
    return this.row[this.scheme.column]? Number(this.row[this.scheme.column]) : 0;
  }

  /** Coerce value to string */
  asString(): string {
    return this.row[this.scheme.column]? String(this.row[this.scheme.column]) : '\u2014';
  }

  /** Synthesize a switchable type for the UI */
  typeOf(): string {
    return this.scheme.showAs? this.scheme.showAs : this.scheme.type;
  }

}
