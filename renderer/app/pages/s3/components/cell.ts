import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { Descriptor } from '../state/s3';
import { Dictionary } from '../services/dictionary';
import { Input } from '@angular/core';
import { PrefsStateModel } from '../../../state/prefs';
import { TreeComponent } from '../tree';

/**
 * S3 cell component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-cell',
  styleUrls: ['cell.scss'],
  templateUrl: 'cell.html'
})

export class CellComponent {

  @Input() desc = {} as Descriptor;
  @Input() entry = {} as Dictionary;
  @Input() prefs = {} as PrefsStateModel;

  /** ctor */
  constructor(public tree: TreeComponent) { }

}
