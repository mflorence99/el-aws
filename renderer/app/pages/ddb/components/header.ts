import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBStateModel } from '../state/ddb';
import { DictionaryService } from '../services/dictionary';
import { ElementRef } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { PrefsStateModel } from '../../../state/prefs';
import { Schema } from '../state/ddbschemas';
import { Scheme } from '../state/ddbschemas';
import { TableComponent } from './table';
import { View } from '../state/ddbviews';
import { ViewChild } from '@angular/core';

import { config } from '../../../config';
import { debounce } from 'ellib';

/**
 * Header component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-header',
  styleUrls: ['header.scss'],
  templateUrl: 'header.html'
})

export class HeaderComponent extends LifecycleComponent {

  @Input() ddb = { } as DDBStateModel;
  @Input() ddbschema = { } as Schema;
  @Input() ddbview = { } as View;
  @Input() prefs = { } as PrefsStateModel;

  @Input() table: TableComponent;

  @ViewChild('canvas') canvas: ElementRef;

  schemes: Scheme[] = [];

  private newStateImpl: Function;

  /** ctor */
  constructor(private dictSvc: DictionaryService,
              private element: ElementRef) {
    super();
    this.newStateImpl = debounce(this._newStateImpl, config.ddb.headerRefreshThrottle);
  }

  // bind OnChange handlers

  @OnChange('ddb', 'ddbschema', 'ddbview', 'prefs') newState(): void {
    if (this.ddb && this.ddbschema && this.ddbview && this.prefs) 
      this.newStateImpl();
  }

  // private methods

  private _newStateImpl(): void {
    this.schemes = this.dictSvc.schemaForView(this.ddb, this.ddbschema, this.ddbview);
    if (this.table && this.ddb.rows && this.canvas)
      this.drawHeaders();
  }

  private configureCanvas(headers: Headers): void {
    const header = this.element.nativeElement.querySelector('header');
    const rect = <DOMRect>header.getBoundingClientRect();
    const style = window.getComputedStyle(header);
    headers.canvas.height = rect.height;
    headers.canvas.width = headers.width;
    headers.ctx.fillStyle = style.color;
    headers.ctx.strokeStyle = style.getPropertyValue('--mat-grey-700');
    headers.ctx.setLineDash([1, 2]);
  }

  private drawHeaders(): void {
    const row = this.table.element.nativeElement.querySelector('table tr');
    if (row) {
      const cells: HTMLElement[] = Array.from(row.querySelectorAll('td'));
      const headers = this.makeHeaders(cells);
      this.configureCanvas(headers);
      if (this.prefs.showGridLines)
        this.drawHeaderBorders(headers);
    }
  }

  private drawHeaderBorders(headers: Headers): void {
    const offset = headers.canvas.height * config.ddb.headerSlantAngle;
    headers.hdrs.forEach(hdr => {
      headers.ctx.beginPath();
      headers.ctx.moveTo(hdr.x + hdr.width - offset, 0);
      headers.ctx.lineTo(hdr.x + hdr.width, headers.canvas.height - 1);
      headers.ctx.closePath();
      headers.ctx.stroke();
    });
  }

  private makeHeaders(cells: HTMLElement[]): Headers {
    const headers: Headers = { 
      canvas: this.canvas.nativeElement, 
      ctx: this.canvas.nativeElement.getContext('2d'),
      hdrs: [], 
      width: 0 
    };
    for (let ix = 0; ix < cells.length; ix++) {
      const rect = <DOMRect>cells[ix].getBoundingClientRect();
      const header: Header = { 
        tag: null, 
        width: rect.width, 
        x: rect.x  
      };
      // the first column is just the row number and not part of the schema
      if (ix > 0) {
        // @see https://stackoverflow.com/questions/18379254
        // @see https://stackoverflow.com/questions/11332772
        header.tag = this.schemes[ix - 1].tag.replace(/([a-z](?=[A-Z]))/g, '$1 ').split(/[^a-zA-Z0-9']+/);
      }
      headers.hdrs.push(header);
      headers.width = Math.max(headers.width, header.x + header.width);
    }
    return headers;
  }

}

/**
 * Model a header
 */

interface Headers {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  hdrs: Header[];
  width: number;
}

interface Header {
  tag: string[];
  width: number;
  x: number;
}
