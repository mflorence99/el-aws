import { Component } from '@angular/core';

/**
 * Root page
 */

@Component({
  selector: 'elaws-root',
  styleUrls: ['page.scss'],
  templateUrl: 'page.html'
})

export class RootPageComponent { 

  tabs = [

    { color: 'var(--mat-yellow-a400)', 
      icon: ['fas', 'archive'], 
      route: '/s3', 
      title: 'S3' },

    { color: 'var(--mat-amber-a400)', 
      icon: ['fas', 'database'], 
      route: '/ddb', 
      title: 'DDB' },

    { color: 'var(--mat-orange-a400)', 
      icon: ['fas', 'server'], 
      route: '/ec2', 
      title: 'EC2' }

  ];

} 

/**
 * Formalize tab definition
 */

export interface RoutePresentation {
  color: string;
  icon: string[];
  route: string;
  title: string;
}
