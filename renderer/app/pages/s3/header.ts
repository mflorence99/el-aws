import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { Dictionary } from './services/dictionary';
import { DictionaryService } from './services/dictionary';
import { ElementRef } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { OnChange } from 'ellib';
import { OnDestroy } from '@angular/core';
import { OnInit } from '@angular/core';
import { PrefsStateModel } from '../../state/prefs';
import { S3PageComponent } from './page';
import { S3ViewStateModel } from './state/s3view';
import { Store } from '@ngxs/store';
import { UpdateWidths } from './state/s3view';
import { ViewChild } from '@angular/core';
import { ViewWidths } from './state/s3view';

/**
 * Header component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-header',
  templateUrl: 'header.html',
  styleUrls: ['header.scss']
})

export class HeaderComponent extends LifecycleComponent
                             implements OnDestroy, OnInit {

  @Input() prefs = { } as PrefsStateModel;
  @Input() view = { } as S3ViewStateModel;

  @ViewChild('outliner') outliner: ElementRef;

  dictionary: Dictionary[] = [];

  /** ctor */
  constructor(private dictSvc: DictionaryService,
              public page: S3PageComponent,
              private store: Store) {
    super();
  }

  // event handlers

  onOutlinerShow(event: {gutterNum: number,
                         sizes: number[]}): void {
    const base = this.page.element.nativeElement;
    const ctrl = this.outliner.nativeElement;
    const box = base.getBoundingClientRect();
    let pos = 0;
    for (let ix = 0; ix < event.gutterNum; ix++)
      pos += event.sizes[ix];
    ctrl.style.left = `${box.x + ((box.width * pos) / 100)}px`;
    ctrl.style.height = `${box.height}px`;
    ctrl.style.top = `${box.y}px`;
    ctrl.style.display = 'block';
  }

  onSplitSizeChange(event: {gutterNum: number,
                            sizes: number[]}): void {
    const ctrl = this.outliner.nativeElement;
    ctrl.style.display = 'none';
    // NOTE: sanity check -- we've seen fewer split sizes that there are splits
    // @see https://github.com/mflorence99/el-file/issues/6
    if (event.sizes.length === this.dictionary.length) {
      const widths = this.dictionary.reduce((acc, entry, ix) => {
        acc[entry.name] = event.sizes[ix];
        return acc;
      }, { } as ViewWidths);
      this.store.dispatch(new UpdateWidths({ widths }));
    }
  }

  // bind OnChange handlers

  @OnChange('view') onView(): void {
    if (this.view)
      this.dictionary = this.dictSvc.dictionaryForView(this.view);
  }

  // lifecycle methods

  ngOnDestroy(): void {
    document.body.removeChild(this.outliner.nativeElement);
  }

  ngOnInit(): void {
    document.body.appendChild(this.outliner.nativeElement);
  }

}
