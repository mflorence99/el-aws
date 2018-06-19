import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { MatTabGroup } from '@angular/material';
import { Navigate } from '@ngxs/router-plugin';
import { OnChange } from 'ellib';
import { RoutePresentation } from './page';
import { RouterStateModel } from '@ngxs/router-plugin';
import { SetRoute } from '../../state/window';
import { Store } from '@ngxs/store';
import { ViewChild } from '@angular/core';

/**
 * Tabs page
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-tabs',
  styleUrls: ['tabs.scss'],
  templateUrl: 'tabs.html'
})

export class TabsComponent extends LifecycleComponent { 

  @Input() router = {} as RouterStateModel;
  @Input() tabs: RoutePresentation[] = [];

  @ViewChild(MatTabGroup) tabGroup: MatTabGroup;

  /** ctor */
  constructor(private store: Store) { 
    super();
  }

  // event handlers

  onTabSelect(ix: number): void {
    this.store.dispatch(new Navigate([this.tabs[ix].route]));
  }

  // bind OnChange handlers

  @OnChange('router') newRoute() {
    if (this.router.state) {
      const route = this.router.state.url;
      this.store.dispatch(new SetRoute(route));
      const ix = this.tabs.findIndex(tab => tab.route === route);
      if (ix !== -1)
        this.tabGroup.selectedIndex = ix;
    }
  }

}
