import * as moment from 'moment';

import { Injectable } from '@angular/core';

/**
 * Period resolver service
 */

@Injectable()
export class PeriodResolverService {

  /** Tests if a Date is in range */
  isInRange(target: string | Date,
            period: string): boolean {
    const date = moment(target);
    const range = this.resolve(period);
    // NOTE: range is inclusive / exclusive
    return (date.isSame(range.from) || date.isAfter(range.from)) && date.isBefore(range.to);
  }

  /** Convert relative period into a [from, to) range */
  resolve(period: string): { from: moment.Moment, to: moment.Moment } {
    let from: moment.Moment, to: moment.Moment;
    switch (period) {

      // @see https://github.com/moment/moment/issues/2407
      case 'ANYTIME':
        from = moment.utc(-8640000000000000);
        to = moment.utc(8640000000000000);
        break;

      case 'TODAY':
        from = moment().startOf('day');
        to = moment().add(1, 'year');
        break;

      case 'YESTERDAY':
        from = moment().startOf('day').subtract(1, 'day');
        to = moment().startOf('day');
        break;

      case 'LAST_2_DAYS':
        from = moment().startOf('day').subtract(1, 'day');
        to = moment().add(1, 'year');
        break;

      case 'LAST_3_DAYS':
        from = moment().startOf('day').subtract(2, 'days');
        to = moment().add(1, 'year');
        break;

      case 'LAST_7_DAYS':
        from = moment().startOf('day').subtract(6, 'days');
        to = moment().add(1, 'year');
        break;

      case 'THIS_WEEK':
        from = moment().startOf('week');
        to = moment().add(1, 'year');
        break;

      case 'LAST_WEEK':
        from = moment().startOf('week').subtract(1, 'week');
        to = moment().startOf('week');
        break;

      case 'THIS_MONTH':
        from = moment().startOf('month');
        to = moment().add(1, 'year');
        break;

      case 'LAST_MONTH':
        from = moment().startOf('month').subtract(1, 'month');
        to = moment().startOf('month');
        break;

      case 'THIS_QUARTER':
        from = moment().startOf('quarter');
        to = moment().add(1, 'year');
        break;

      case 'LAST_QUARTER':
        from = moment().startOf('quarter').subtract(1, 'quarter');
        to = moment().startOf('quarter');
        break;

      case 'THIS_YEAR':
        from = moment().startOf('year');
        to = moment().add(1, 'year');
        break;

      case 'LAST_YEAR':
        from = moment().startOf('year').subtract(1, 'year');
        to = moment().startOf('year');
        break;

    }
    return { from, to };
  }

}
