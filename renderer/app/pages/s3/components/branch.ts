import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';

/**
 * S3 branch component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-branch',
  styleUrls: ['branch.scss'],
  templateUrl: 'branch.html'
})

export class BranchComponent { } 
