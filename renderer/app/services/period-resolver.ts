import * as moment from 'moment';

import { Injectable } from '@angular/core';

/**
 * Period resolver service
 */

@Injectable()
export class PeriodResolverService {

  /** Convert relative period into a [from, to) range */
  resolve(period: string): moment.FromTo {
    let from: moment.MomentInput, to: moment.MomentInput;
    switch (period) {

      case 'TODAY':
        from = moment().startOf('day');
        to = moment();
        break;

      case 'YESTERDAY':
        from = moment().startOf('day').subtract(1, 'day');
        to = moment().startOf('day');
        break;

      case 'LAST_2_DAYS':
        from = moment().startOf('day').subtract(1, 'day');
        to = moment();
        break;

      case 'LAST_3_DAYS':
        from = moment().startOf('day').subtract(2, 'days');
        to = moment();
        break;

      case 'LAST_7_DAYS':
        from = moment().startOf('day').subtract(6, 'days');
        to = moment();
        break;

      case 'THIS_WEEK':
        from = moment().startOf('week');
        to = moment();
        break;

      case 'LAST_WEEK':
        from = moment().startOf('week').subtract(1, 'week');
        to = moment().startOf('week');
        break;

      case 'THIS_MONTH':
        from = moment().startOf('month');
        to = moment();
        break;

      case 'LAST_MONTH':
        from = moment().startOf('month').subtract(1, 'month');
        to = moment().startOf('month');
        break;

      case 'THIS_QUARTER':
        from = moment().startOf('quarter');
        to = moment();
        break;

      case 'LAST_QUARTER':
        from = moment().startOf('quarter').subtract(1, 'quarter');
        to = moment().startOf('quarter');
        break;

      case 'THIS_YEAR':
        from = moment().startOf('year');
        to = moment();
        break;

      case 'LAST_YEAR':
        from = moment().startOf('year').subtract(1, 'year');
        to = moment().startOf('year');
        break;

      case 'ANYTIME':
        from = moment.unix(0);
        to = moment();
        break;

    }
    return { from, to };
  }

}
