import { Action } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class SetFilter {
  static readonly type = '[S3Filter] set filter';
  constructor(public readonly payload: { bucket: string, filter: S3Filter }) { }
}

export interface S3Filter {
  bucket: string;
  match?: string;
  period?: string;
  submitted?: boolean;
}

export interface S3FilterStateModel {
  [bucket: string]: S3Filter;
}

@State<S3FilterStateModel>({
  name: 's3filter',
  defaults: { }
}) export class S3FilterState {

  static filterDefaults(filter?: any | null): S3Filter {
    filter = { ...(filter || { } as S3Filter) };
    filter.match = filter.match || '**/*';
    filter.period = filter.period || 'ANYTIME';
    return filter;
  }

  @Action(SetFilter)
  setcolor({ patchState }: StateContext<S3FilterStateModel>,
           { payload }: SetFilter) {
    const { bucket, filter } = payload;
    patchState({ [bucket]: filter });
  }

}
