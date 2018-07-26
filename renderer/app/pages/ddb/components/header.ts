import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { DDBStateModel } from '../state/ddb';
import { DictionaryService } from '../services/dictionary';
import { ElementRef } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { HostListener } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { Output } from '@angular/core';
import { PaneComponent } from './pane';
import { PrefsStateModel } from '../../../state/prefs';
import { Schema } from '../state/ddbschemas';
import { Scheme } from '../state/ddbschemas';
import { Store } from '@ngxs/store';
import { UpdateSort } from '../state/ddbviews';
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

  @Output() columnHover = new EventEmitter<string>();

  @ViewChild('canvas') _canvas: ElementRef;

  schemes: Scheme[] = [];

  private drawHeader: Function;
  private hitTest: Function;
  private newStateImpl: Function;

  private canvas: HTMLCanvasElement;
  private columns: Column[] = [];
  private ctx: CanvasRenderingContext2D;
  private cx: number;
  private lineHeight = config.ddb.headerLineHeight;
  private maxHeight: number;
  private normalFill: string;
  private padding = config.ddb.headerPadding;
  private hoverFill: string;

  /** ctor */
  constructor(private dictSvc: DictionaryService,
              private element: ElementRef,
              public pane: PaneComponent,
              private store: Store) {
    super();
    this.drawHeader = debounce(this.drawHeaderImpl, config.ddb.headerRedrawThrottle);
    this.hitTest = debounce(this.hitTestImpl, config.ddb.headerRedrawThrottle);
    this.newStateImpl = debounce(this._newStateImpl, config.ddb.headerRefreshThrottle);
  }

  // listeners

  @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent) {
    this.hitTest(event);
  }

  @HostListener('mousemove', ['$event']) onMouseMove(event: MouseEvent) {
    this.hitTest(event);
  }

  @HostListener('mouseout', ['$event']) onMouseOut(event: MouseEvent) {
    this.hitTest(event);
  }

  @HostListener('window:resize') onResize() {
    this.drawHeader();
  }

  // event handlers

  onNewTable() {
    this.newState();
  }

  // bind OnChange handlers

  @OnChange('prefs') newState(): void {
    if (this.ddb && this.ddb.table && this.ddbschema && this.ddbview && this.prefs) 
      this.newStateImpl();
  }

  // private methods

  private _newStateImpl(): void {
    this.schemes = this.dictSvc.schemaForView(this.ddb, this.ddbschema, this.ddbview);
    this.drawHeaderImpl();
  }

  private buildColumns(cells: HTMLElement[]): void {
    this.columns = [];
    this.cx = 0;
    for (let ix = 0, x = 0; ix < cells.length; ix++) {
      const rect = <DOMRect>cells[ix].getBoundingClientRect();
      // NOTE: the first column is just the row number and not part of the schema
      const sort = ((ix === 0) || (this.ddbview.sortColumn !== this.schemes[ix - 1].column))?
        null : ((this.ddbview.sortDir === 1) ? '\u2B9D' : '\u2B9F');
      // @see https://stackoverflow.com/questions/18379254
      // @see https://stackoverflow.com/questions/11332772
      this.columns.push({ 
        cx: rect.width, 
        path: null, // @see defineColumnPaths()
        hover: false, 
        scheme: (ix === 0) ? null : this.schemes[ix - 1], 
        tag: (ix === 0) ? null : this.schemes[ix - 1].tag
          .replace(/([a-z](?=[A-Z]))/g, '$1 ')
          .toUpperCase()
          .split(/[^a-zA-Z0-9']+/)
          .concat(sort? [sort] : []), 
        x: x 
      });
      // assume all coumns are adjacent
      x += rect.width;
      this.cx = Math.max(this.cx, rect.x + rect.width);
    }
  }

  private condenseHeader(): void {
    const style = this.pane.element.nativeElement.style;
    style.setProperty('--elaws-header-margin', `-${this.canvas.height - this.maxHeight}px`);
  }

  private configureCanvas(): void {
    this.canvas = this._canvas.nativeElement;
    this.ctx = this.canvas.getContext('2d');
    const node = this.element.nativeElement.querySelector('header');
    const rect = <DOMRect>node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    this.canvas.height = rect.height;
    this.canvas.width = this.cx;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = style.color;
    this.ctx.font = `bold ${style.fontSize} ${style.fontFamily}`;
    this.ctx.strokeStyle = style.getPropertyValue('--mat-grey-700');
    this.ctx.setLineDash([1, 1]);
    this.normalFill = style.getPropertyValue('--mat-grey-900');
    this.hoverFill = style.getPropertyValue('--mat-grey-800');
  }

  private defineColumnPaths(): void {
    const theta = config.ddb.headerSlantAngle * (Math.PI / 180);
    const offset = this.canvas.height * Math.tan(theta);
    this.columns.forEach(column => {
      column.path = new Path2D();
      column.path.moveTo(column.x - offset, 0);
      column.path.lineTo(column.x, this.canvas.height - 1);
      column.path.lineTo(column.x + column.cx, this.canvas.height - 1);
      column.path.lineTo(column.x + column.cx - offset, 0);
      column.path.closePath();
    });
  }

  private drawColumn(column: Column,
                     cx: number,
                     dx: number,
                     align: 'left' | 'center' | 'right',
                     cb: (frags: Fragment[], numLines: number) => void): void {
    let x = 0;
    const y = 0;
    // mark out where each tag fragment should be drawn
    const frags: Fragment[] = [];
    let newLine = false, numLines = 1;
    for (let ix = 0; ix < column.tag.length;) {
      let part = column.tag[ix];
      // if jumping to new line, adjust prior fragments
      if (newLine) {
        newLine = false;
        numLines += 1;
        frags.forEach(frag => (frag.x -= dx) && (frag.y -= this.lineHeight));
        x = 0;
      }
      // does it fit?
      // if so, just lay it out and go to the next fragment
      let metrics = this.ctx.measureText(part);
      if ((x + metrics.width) < cx) {
        frags.push({ x, y, part, metrics });
        x += metrics.width + this.padding;
        ix = ix + 1;
      }
      // no it doesn't fit and this is the first fragment on the line
      // so try shortening it
      else if (x === 0) {
        while (part.length > 1) {
          part = part.substring(0, part.length - 1);
          metrics = this.ctx.measureText(part);
          if ((x + metrics.width + this.padding) < cx)
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
      const lineNum = frag.y / this.lineHeight;
      if (align === 'center')
        frag.x += leftOver / 2;
      else if (align === 'right')
        frag.x += leftOver + (dx * lineNum);
    });
    // finally, callback
    cb(frags, numLines);
  }

  private drawColumnHorizontal(column: Column): void {
    const theta = config.ddb.headerSlantAngle * (Math.PI / 180);
    const dx = this.lineHeight * Math.tan(theta);
    const cx = column.cx - (2 * this.padding) - dx;
    // set origin to bottom line and draw the column
    this.ctx.translate(column.x + this.padding, this.canvas.height - this.padding);
    this.drawColumn(column, cx, dx, 'left', 
      (frags: Fragment[], numLines: number) => {
        frags.forEach(frag => this.ctx.fillText(frag.part, frag.x, frag.y));
        // NOTE: calculate maxHeight so we can condense the header
        const height = (numLines * this.lineHeight) + (2 * this.padding);
        this.maxHeight = Math.max(this.maxHeight, height);
      });
  }

  private drawColumnSlanted(column: Column): void {
    const theta = config.ddb.headerSlantAngle * (Math.PI / 180);
    const phi = (90 - config.ddb.headerSlantAngle) * (Math.PI / 180);
    const dx = -(this.lineHeight * Math.tan(theta));
    const cx = (this.canvas.height / Math.cos(theta)) - (2 *this.padding);
    // set origin to bottom line and rotate then draw the column
    // TODO: don't know why this isn't straight padding
    const fudge = (3 * this.padding) / 2;
    this.ctx.translate(column.x + fudge - (this.canvas.height * Math.tan(theta)), this.padding);
    this.ctx.rotate(phi);
    this.drawColumn(column, cx, dx, 'right',
      (frags: Fragment[], numLines: number) => {
        const cy = (column.cx * Math.cos(theta)) - (2 * this.padding);
        // NOTE: center single column
        if (numLines === 1)
          frags.forEach(frag => (frag.x -= dx + this.padding) && (frag.y -= (cy - this.lineHeight)));
        frags.forEach(frag => this.ctx.fillText(frag.part, frag.x, frag.y));
      });
    // NOTE: we always show full height when drawing slanted
    this.maxHeight = this.canvas.height;
  }

  private drawColumns(): void {
    this.maxHeight = 0;
    this.columns
      .filter(column => !!column.tag)
      .forEach(column => {
        this.ctx.save();
        this.ctx.clip(column.path);
        // NOTE: columns below a certain magic width have slanted headers
        if ((column.cx / this.lineHeight) < config.ddb.headerSlantThreshold)
          this.drawColumnSlanted(column);
        else this.drawColumnHorizontal(column);
        this.ctx.restore();
      });
  }

  private drawColumnBorders(): void {
    const theta = config.ddb.headerSlantAngle * (Math.PI / 180);
    const offset = this.canvas.height * Math.tan(theta);
    this.columns.forEach(column => {
      this.ctx.beginPath();
      this.ctx.moveTo(column.x + column.cx - offset, 0);
      this.ctx.lineTo(column.x + column.cx, this.canvas.height - 1);
      this.ctx.closePath();
      this.ctx.stroke();
    });
  }

  private drawHeaderImpl(force = true): void {
    if (this.ddb.rows && this._canvas && this.schemes && (this.schemes.length > 0)) {
      const row = this.pane.element.nativeElement.querySelector('table tr');
      if (row) {
        if (force) {
          const cells: HTMLElement[] = Array.from(row.querySelectorAll('td'));
          this.buildColumns(cells);
          this.configureCanvas();
          this.defineColumnPaths();
        }
        this.fillColumns();
        this.drawColumns();
        if (this.prefs.showGridLines)
          this.drawColumnBorders();
        this.condenseHeader();
      }
    }
  }

  private fillColumns(): void {
    this.ctx.save();
    this.columns.forEach(column => {
      this.ctx.fillStyle = (column.hover)? this.hoverFill : this.normalFill;
      this.ctx.fill(column.path);
    });
    this.ctx.restore();
  }

  private hitTestImpl(event: MouseEvent): void {
    if (this.columns && (this.columns.length > 0)) {
      const rect = <DOMRect>this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.x;
      const y = event.clientY - rect.y;
      // NOTE: first column is just an index an not part of schema
      let iy = 0;
      this.columns.forEach((column, ix) => {
        column.hover = ((ix > 0) && this.ctx.isPointInPath(column.path, x, y));
        if (column.hover)
          iy = ix;
      });
      this.drawHeaderImpl(false);
      // emit hover event
      this.columnHover.emit((iy > 0) ? this.schemes[iy - 1].column : null);
      // change sort state
      if ((event.type === 'mousedown') && (iy > 0)) {
        const sortColumn = this.schemes[iy - 1].column;
        let sortDir = 1;
        if (this.ddbview.sortColumn === sortColumn)
          sortDir = this.ddbview.sortDir * -1;
        const tableName = this.ddb.table.TableName;
        this.store.dispatch(new UpdateSort({ sortColumn, sortDir, tableName }));
      }
    }
  }

}

/**
 * Model internal data structures
 */

interface Column {
  cx: number;
  hover: boolean;
  path: Path2D;
  scheme: Scheme;
  tag: string[];
  x: number;
}

interface Fragment {
  part: string;
  metrics: TextMetrics;
  x: number;
  y: number;
}
