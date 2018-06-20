import { Component } from '@angular/core';
import { DDBGuard } from '../../guards/ddb';
import { Observable } from 'rxjs';
import { S3Guard } from '../../guards/s3';

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

    { 
      canNavigate: [S3Guard],
      color: 'var(--mat-yellow-a400)', 
      icon: ['fas', 'archive'], 
      route: '/s3', 
      title: 'S3' 
    },

    { 
      canNavigate: [DDBGuard],
      color: 'var(--mat-amber-a400)', 
      icon: ['fas', 'database'], 
      route: '/ddb', 
      title: 'DDB' 
    },

    { 
      color: 'var(--mat-orange-a400)', 
      icon: ['fas', 'server'], 
      route: '/ec2', 
      title: 'EC2' 
    }

  ];

} 

/**
 * Formalize tab definition
 */

export interface RoutePresentation {
  canNavigate?: CanNavigate[];
  color: string;
  icon: string[];
  route: string;
  title: string;
}

export interface CanNavigate {
  canNavigate: () => Observable<boolean>;
}
