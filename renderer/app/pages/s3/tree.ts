import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';

/**
 * S3 tree component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-tree',
  styleUrls: ['tree.scss'],
  templateUrl: 'tree.html'
})

export class TreeComponent { } 
