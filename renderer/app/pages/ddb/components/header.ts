import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBStateModel } from '../state/ddb';
import { DictionaryService } from '../services/dictionary';
import { ElementRef } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { PaneComponent } from './pane';
import { PrefsStateModel } from '../../../state/prefs';
import { Schema } from '../state/ddbschemas';
import { Scheme } from '../state/ddbschemas';
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

  @ViewChild('canvas') canvas: ElementRef;

  schemes: Scheme[] = [];

  private newStateImpl: Function;

  /** ctor */
  constructor(private dictSvc: DictionaryService,
              private element: ElementRef,
              public pane: PaneComponent) {
    super();
    this.newStateImpl = debounce(this._newStateImpl, config.ddb.headerRefreshThrottle);
  }

  // bind OnChange handlers

  @OnChange('ddb', 'ddbschema', 'ddbview', 'prefs') newState(): void {
    if (this.ddb && this.ddb.table && this.ddbschema && this.ddbview && this.prefs) 
      this.newStateImpl();
  }

  // private methods

  private _newStateImpl(): void {
    this.schemes = this.dictSvc.schemaForView(this.ddb, this.ddbschema, this.ddbview);
    if (this.ddb.rows && this.canvas && this.schemes && (this.schemes.length > 0)) 
      this.drawHeader();
  }

  private condenseHeader(header: Header): void {
    const style = this.pane.element.nativeElement.style;
    style.setProperty('--elaws-header-margin', `-${header.canvas.height - header.maxHeight}px`);
  }

  private configureCanvas(header: Header): void {
    const node = this.element.nativeElement.querySelector('header');
    const rect = <DOMRect>node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    header.canvas.height = rect.height;
    header.canvas.width = header.width;
    header.ctx.fillStyle = style.color;
    header.ctx.font = `bold ${style.fontSize} ${style.fontFamily}`;
    header.ctx.strokeStyle = style.getPropertyValue('--mat-grey-700');
    header.ctx.setLineDash([1, 1]);
  }

  private drawColumn(header: Header,
                     column: Column,
                     cx: number,
                     cy: number,
                     dx: number,
                     align: 'left' | 'center' | 'right',
                     cb: (frags, numLines) => void): void {
    let x = 0;
    const y = 0;
    // mark out where each tag fragment should be drawn
    const frags = [];
    let newLine = false, numLines = 1;
    const maxLines = Math.trunc(cy / header.lineHeight) + 1;
    for (let ix = 0; ix < column.tag.length;) {
      let part = column.tag[ix];
      // if jumping to new line, adjust prior fragments
      if (newLine) {
        newLine = false;
        numLines += 1;
        // full up?
        if (numLines > maxLines)
          break;
        frags.forEach(frag => (frag.x -= dx) && (frag.y -= header.lineHeight));
        x = 0;
      }
      // does it fit?
      // if so, just lay it out and go to the next fragment
      let metrics = header.ctx.measureText(part);
      if ((x + metrics.width) < cx) {
        frags.push({ x, y, part, metrics });
        x += metrics.width + header.padding;
        ix = ix + 1;
      }
      // no it doesn't fit and this is the first fragment on the line
      // so try shortening it
      else if (x === 0) {
        while (part.length > 1) {
          part = part.substring(0, part.length - 1);
          metrics = header.ctx.measureText(part);
          if ((x + metrics.width + header.padding) < cx)
            break;
        }
        frags.push({ x, y, part: part + '\u2026', metrics });
        ix = ix + 1;
        newLine = true;
      }
      // no it doesn't fit and there's already something on this line
      // so try on the next line
      else if (x > 0)
        newLine = true;
    }
    // for each "y" aka "line" how much was left over?
    // NOTE: because we draw them in the right order, the last one wins
    const leftOvers = frags.reduce((acc, frag) => {
      acc[frag.y] = cx - (frag.x + frag.metrics.width);
      return acc;
    }, { });
    // adjust each fragment for desired alignment
    frags.forEach(frag => {
      const leftOver = leftOvers[frag.y];
      if (align === 'center')
        frag.x += leftOver / 2;
      else if (align === 'right')
        frag.x += leftOver;
    });
    // finally, callback
    cb(frags, numLines);
  }

  private drawColumnHorizontal(header: Header,
                               column: Column): void {
    const theta = config.ddb.headerSlantAngle * (Math.PI / 180);
    const dx = header.lineHeight * Math.tan(theta);
    const cx = column.width - (2 * header.padding) - dx;
    const cy = header.canvas.height;
    // set origin to bottom line and draw the column
    header.ctx.translate(column.x + header.padding, header.canvas.height - header.padding);
    this.drawColumn(header, column, cx, cy, dx, 'left', 
      (frags, numLines) => {
        frags.forEach(frag => header.ctx.fillText(frag.part, frag.x, frag.y));
        const height = (numLines * header.lineHeight) + header.padding;
        header.maxHeight = Math.max(header.maxHeight, height);
      });
  }

  private drawColumnSlanted(header: Header,
                            column: Column): void {
    const theta = config.ddb.headerSlantAngle * (Math.PI / 180);
    const dx = -(header.lineHeight * Math.tan(theta));
    const cx = (header.canvas.height / Math.cos(theta)) - (2 * header.padding);
    const cy = (column.width * Math.cos(theta)) - (2 * header.padding);
    // set origin to bottom line and rotate then draw the column
    // TODO: don't know why this isn't straight padding
    const fudge = (3 * header.padding) / 2;
    header.ctx.translate(column.x + fudge - (header.canvas.height * Math.tan(theta)), header.padding);
    const phi = (90 - config.ddb.headerSlantAngle) * (Math.PI / 180);
    header.ctx.rotate(phi);
    this.drawColumn(header, column, cx, cy, dx, 'right',
      (frags, numLines) => {
        // NOTE: center single column
        if (numLines === 1)
          frags.forEach(frag => (frag.x -= dx) && (frag.y -= (cy - header.lineHeight));
        frags.forEach(frag => header.ctx.fillText(frag.part, frag.x, frag.y));
      });
    // NOTE: we always show full height when drawing slanted
    header.maxHeight = header.canvas.height;
  }

  private drawColumns(header: Header): void {
    header.columns
      .filter(column => !!column.tag)
      .forEach(column => {
        if ((column.width / header.lineHeight) <= 4)
          this.drawColumnSlanted(header, column);
        else this.drawColumnHorizontal(header, column);
        header.ctx.setTransform(1, 0, 0, 1, 0, 0);
      });
  }

  private drawColumnBorders(header: Header): void {
    const theta = config.ddb.headerSlantAngle * (Math.PI / 180);
    const offset = header.canvas.height * Math.tan(theta);
    header.columns.forEach(column => {
      header.ctx.beginPath();
      header.ctx.moveTo(column.x + column.width - offset, 0);
      header.ctx.lineTo(column.x + column.width, header.canvas.height - 1);
      header.ctx.closePath();
      header.ctx.stroke();
    });
  }

  private drawHeader(): void {
    const row = this.pane.element.nativeElement.querySelector('table tr');
    if (row) {
      const cells: HTMLElement[] = Array.from(row.querySelectorAll('td'));
      const header: Header = {
        canvas: this.canvas.nativeElement,
        ctx: this.canvas.nativeElement.getContext('2d'),
        columns: [],
        // TODO: not sure how to eliminate this magic number
        lineHeight: config.ddb.headerLineHeight,
        maxHeight: 0,
        // TODO: not sure how to eliminate this magic number
        padding: config.ddb.headerPadding,
        width: 0
      };
      this.populateHeader(header, cells);
      this.configureCanvas(header);
      this.drawColumns(header);
      if (this.prefs.showGridLines)
        this.drawColumnBorders(header);
      this.condenseHeader(header);
    }
  }

  private populateHeader(header: Header,
                          cells: HTMLElement[]): void {
    for (let ix = 0; ix < cells.length; ix++) {
      const rect = <DOMRect>cells[ix].getBoundingClientRect();
      const column: Column = { 
        tag: null, 
        width: rect.width, 
        x: rect.x  
      };
      // the first column is just the row number and not part of the schema
      if (ix > 0) {
        // @see https://stackoverflow.com/questions/18379254
        // @see https://stackoverflow.com/questions/11332772
        column.tag = this.schemes[ix - 1].tag
          .replace(/([a-z](?=[A-Z]))/g, '$1 ')
          .toUpperCase()
          .split(/[^a-zA-Z0-9']+/);
      }
      header.columns.push(column);
      header.width = Math.max(header.width, column.x + column.width);
    }
  }

}

/**
 * Model a header
 */

interface Header {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  columns: Column[];
  lineHeight: number;
  maxHeight: number;
  padding: number;
  width: number;
}

interface Column {
  tag: string[];
  width: number;
  x: number;
}
