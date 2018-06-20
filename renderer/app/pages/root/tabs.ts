import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { Injector } from '@angular/core';
import { Input } from '@angular/core';
import { LifecycleComponent } from 'ellib';
import { MatTabGroup } from '@angular/material';
import { Navigate } from '@ngxs/router-plugin';
import { Observable } from 'rxjs';
import { OnChange } from 'ellib';
import { RoutePresentation } from './page';
import { RouterStateModel } from '@ngxs/router-plugin';
import { SetRoute } from '../../state/window';
import { Store } from '@ngxs/store';
import { ViewChild } from '@angular/core';

import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { of } from 'rxjs';

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
  constructor(private injector: Injector,
              private store: Store) { 
    super();
  }

  /** Is this tab navigable? */
  canNavigate$(tab: RoutePresentation): Observable<boolean> {
    return combineLatest(this.canNavigate(tab))
      .pipe(
        map(flags => flags.every(can => can))
      );
  }

  // event handlers

  onTabSelect(ix: number): void {
    this.store.dispatch(new Navigate([this.tabs[ix].route]));
  }

  // bind OnChange handlers

  @OnChange('router') newRoute() {
    if (this.router.state) {
      const route = this.router.state.url;
      console.log('%c Navigate to', 'color: orange', route);
      this.store.dispatch(new SetRoute(route));
      const ix = this.tabs.findIndex(tab => tab.route === route);
      this.tabGroup.selectedIndex = ix;
    }
  }

  // private methods

  private canNavigate(tab: RoutePresentation): Observable<boolean>[] {
    if (!tab.canNavigate)
      return [of(true)];
    else return tab.canNavigate.map(clazz => {
      const guard = this.injector.get(clazz);
      return guard.canActivate();
    });
  }

}
