import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { MatTabGroup } from '@angular/material';
import { Navigate } from '@ngxs/router-plugin';
import { Navigator } from '../../services/navigator';
import { OnChange } from 'ellib';
import { SetRoute } from '../../state/window';
import { ShowPagePrefs } from '../../state/window';
import { Store } from '@ngxs/store';
import { ViewChild } from '@angular/core';

/**
 * Tabs component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-tabs',
  styleUrls: ['tabs.scss'],
  templateUrl: 'tabs.html'
})

export class TabsComponent extends LifecycleComponent { 

  // TODO: should expose @ngxs/router-plugin
  @Input() router: any = { };
  @Input() tabs: Navigator[] = [];

  @ViewChild(MatTabGroup, { static: true }) tabGroup: MatTabGroup;

  /** ctor */
  constructor(private store: Store) { 
    super();
  }

  // event handlers

  onShowPagePrefs(): void {
    this.store.dispatch(new ShowPagePrefs());
  }

  onTabSelect(ix: number): void {
    const route = this.tabs[ix].route;
    this.store.dispatch(new Navigate([route]));
  }

  // bind OnChange handlers

  @OnChange('router') newState() {
    if (this.router.state) {
      const route = this.router.state.url;
      console.log('%c Navigate to', 'color: orange', route);
      this.store.dispatch(new SetRoute(route));
      const ix = this.tabs.findIndex(tab => tab.route === route);
      this.tabGroup.selectedIndex = ix;
    }
  }

}
