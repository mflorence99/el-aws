import { Action } from '@ngxs/store';
import { DDBState } from './ddb';
import { Message } from '../../../state/status';
import { Selector } from '@ngxs/store';
import { State } from '@ngxs/store';
import { StateContext } from '@ngxs/store';
import { Store } from '@ngxs/store';

import { pluralize } from 'ellib';

/** NOTE: actions must come first because of AST */

export class AddRowToSelection {
  static readonly type = '[DDBSelection] add row';
  constructor(public readonly payload: { row: number }) { }
}

export class ClearSelection {
  static readonly type = '[DDBSelection] clear';
  constructor(public readonly payload?: any) { }
}

export class RemoveRowFromSelection {
  static readonly type = '[DDBSelection] remove row';
  constructor(public readonly payload: { row: number }) { }
}

export class ReplaceRowsInSelection {
  static readonly type = '[DDBSelection] replace rows';
  constructor(public readonly payload: { rows: number[] }) { }
}

export class SelectColumn {
  static readonly type = '[DDBSelection] select column';
  constructor(public readonly payload: { column: string }) { }
}

export class SelectionColumnUpdated {
  static readonly type = '[DDBSelection] column selected';
  constructor(public readonly payload: { column: string }) { }
}

export class SelectionRowsUpdated {
  static readonly type = '[DDBSelection] rows selected';
  constructor(public readonly payload: { rows: number[] }) { }
}

export class ToggleRowInSelection {
  static readonly type = '[DDBSelection] toggle row';
  constructor(public readonly payload: { row: number }) { }
}

export interface DDBSelectionStateModel {
  column: string;
  rows: number[];
}

@State<DDBSelectionStateModel>({
  name: 'ddbselection',
  defaults: {
    column: null,
    rows: []
  }
}) export class DDBSelectionState {

  @Selector() static getColumn(state: DDBSelectionStateModel): string {
    return state.column;
  }

  @Selector() static getRows(state: DDBSelectionStateModel): number[] {
    return state.rows;
  }

  /** ctor */
  constructor(private store: Store) { }

  @Action(AddRowToSelection)
  addRowToSelection({ dispatch, getState, patchState }: StateContext<DDBSelectionStateModel>,
                    { payload }: AddRowToSelection) {
    const { row } = payload;
    const state = getState();
    if (!state.rows.includes(row)) {
      const rows = state.rows.slice(0);
      rows.push(row);
      patchState({ rows });
      dispatch(new SelectionRowsUpdated({ rows }));
    }
  }

  @Action(ClearSelection)
  clearSelection({ dispatch, patchState }: StateContext<DDBSelectionStateModel>,
                 { payload }: ClearSelection) {
    patchState({ column: null, rows: [] });
    dispatch([
      new SelectionColumnUpdated({ column: null }),
      new SelectionRowsUpdated({ rows: [] })
    ]);
  }

  @Action(RemoveRowFromSelection)
  removeRowFromSelection({ dispatch, getState, patchState }: StateContext<DDBSelectionStateModel>,
                         { payload }: RemoveRowFromSelection) {
    const { row } = payload;
    const state = getState();
    if (state.rows.includes(row)) {
      const rows = state.rows.slice(0);
      const ix = rows.indexOf(row);
      rows.splice(ix, 1);
      patchState({ rows });
      dispatch(new SelectionRowsUpdated({ rows }));
    }
  }

  @Action(ReplaceRowsInSelection)
  replaceRowsInSelection({ dispatch, patchState }: StateContext<DDBSelectionStateModel>,
                         { payload }: ReplaceRowsInSelection) {
    const { rows } = payload;
    patchState({ rows });
    dispatch(new SelectionRowsUpdated({ rows }));
  }

  @Action(SelectColumn)
  selectColumn({ dispatch, patchState }: StateContext<DDBSelectionStateModel>,
               { payload }: SelectColumn) {
    const { column } = payload;
    patchState({ column });
    dispatch(new SelectionColumnUpdated({ column }));
  }

  @Action(SelectionColumnUpdated)
  selectionColumnUpdated({ dispatch }: StateContext<DDBSelectionStateModel>,
                         { payload }: SelectionColumnUpdated) {
    const { column } = payload;
    dispatch(new Message({ text: column? `Column ${column} selected` : '' }));
  }

  @Action(SelectionRowsUpdated)
  selectionRowsUpdated({ dispatch }: StateContext<DDBSelectionStateModel>,
                       { payload }: SelectionRowsUpdated) {
    const { rows } = payload;
    const index = this.store.selectSnapshot(DDBState.getIndex);
    let text = '';
    if (rows.length === 1)
      text = `${rows[0] + index + 1} selected`;
    else if (rows.length > 1) {
      const others = pluralize(rows.length, {
        '=1': 'one other', 'other': '# others'
      });
      text = `${rows[0] + index + 1} and ${others} selected`;
    }
    dispatch(new Message({ text }));
  }

  @Action(ToggleRowInSelection)
  toggleRowInSelection({ dispatch, getState, patchState }: StateContext<DDBSelectionStateModel>,
                       { payload }: ToggleRowInSelection) {
    const { row } = payload;
    const state = getState();
    const rows = state.rows.slice(0);
    const ix = rows.indexOf(row);
    if (ix !== -1)
      rows.splice(ix, 1);
    else rows.push(row);
    patchState({ rows });
    dispatch(new SelectionRowsUpdated({ rows }));
  }

}
