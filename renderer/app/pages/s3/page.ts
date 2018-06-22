import { Component } from '@angular/core';
import { ElementRef } from '@angular/core';

/**
 * S3 page
 */

@Component({
  selector: 'elaws-s3-page',
  styleUrls: ['page.scss'],
  templateUrl: 'page.html'
})

export class S3PageComponent { 

  /** ctor */
  constructor(public element: ElementRef) { }

}
