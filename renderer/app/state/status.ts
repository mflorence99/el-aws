import { Action } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';

/** NOTE: actions must come first because of AST */

export class Alarm {
  static readonly type = '[Status] alarm';
  constructor(public readonly payload: { alarm: boolean }) { }
}

export class Message {
  static readonly type = '[Status] message';
  constructor(public readonly payload: { explanation?: string, level?: MessageLevel, text: string }) { }
}

export type MessageLevel = 'info' | 'warning' | 'error';

export interface StatusStateModel {
  alarm: boolean;
  message: {
    explanation?: string;
    level: MessageLevel;
    text: string;
  };
}

@State<StatusStateModel>({
  name: 'status',
  defaults: {
    alarm: false,
    message: {
      explanation: '',
      level: 'info',
      text: ''
    }
  }
}) export class StatusState {

  @Action(Alarm)
  alarm({ patchState }: StateContext<StatusStateModel>,
        { payload }: Alarm) {
    const { alarm } = payload;
    patchState({ alarm });
  }

  @Action(Message)
  statusMessage({ patchState }: StateContext<StatusStateModel>,
                { payload }: Message) {
    const { explanation, level, text } = payload;
    patchState({ alarm: ((level === 'warning') || (level === 'error')),
                 message: { explanation: explanation || '', level: level || 'info', text } });
  }

}
