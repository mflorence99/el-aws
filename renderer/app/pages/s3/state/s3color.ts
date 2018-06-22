import { Action } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class SetColor {
  static readonly type = '[S3Color] set color';
  constructor(public readonly payload: { ext: string, color: string }) { }
}

export interface S3ColorStateModel {
  [ext: string]: string;
}

@State<S3ColorStateModel>({
  name: 's3color',
  defaults: { }
}) export class S3ColorState {

  @Action(SetColor)
  setcolor({ patchState }: StateContext<S3ColorStateModel>,
           { payload }: SetColor) {
    const { ext, color } = payload;
    patchState({ [ext]: color });
  }

}
