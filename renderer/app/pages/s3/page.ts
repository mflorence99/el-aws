import { Component } from '@angular/core';
import { S3Service } from './services/s3';

/**
 * S3 page
 */

@Component({
  selector: 'elaws-s3-page',
  styleUrls: ['page.scss'],
  templateUrl: 'page.html'
})

export class S3PageComponent { 

  /** TODO: temporary */
  constructor(s3Svc: S3Service) {

  }

}
