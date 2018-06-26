import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { ContentChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FormControl } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { HostBinding } from '@angular/core';
import { Input } from '@angular/core';
import { MatFormFieldControl } from '@angular/material';
import { NgControl } from '@angular/forms';
import { OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { TemplateRef } from '@angular/core';
import { Validators } from '@angular/forms';

/**
 * Model <key-value> data types
 */

export type KeyValueArray = KeyValueTuple[];

export type KeyValueArrayOfHashes = KeyValueHash[];

export interface KeyValueHash {
  [key: string]: string;
}

export type KeyValueTuple = [string, string];

export type KeyValueType = KeyValueArray | KeyValueArrayOfHashes | KeyValueHash | null;

/**
 * <key-value> component
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: MatFormFieldControl, useExisting: KeyValueComponent }],
  selector: 'elaws-key-value',
  styleUrls: ['key-value.scss'],
  templateUrl: 'key-value.html'
})

export class KeyValueComponent implements MatFormFieldControl<KeyValueType>, OnDestroy { 

  static nextID = 0;

  @ContentChild('keyIcon') keyIcon: TemplateRef<any>;
  @ContentChild('valueIcon') valueIcon: TemplateRef<any>;

  @HostBinding('attr.aria-describedby') describedBy = '';
  @HostBinding() id = `my-tel-input-${KeyValueComponent.nextID++}`;

  @Input() asArray = false;
  @Input() asArrayOfHashes: KeyValueTuple;
  @Input() asHash = true;

  // @see MatFormFieldControl
  controlType = 'elaws-key-value';
  empty = false;
  errorState = false;
  focused = false;
  ngControl: NgControl = null;
  shouldLabelFloat = false;
  stateChanges = new Subject<void>();

  keys: string[] = [];
  keyValueForm: FormGroup;

  // disabled accessor / mutator

  @Input() get disabled(): boolean {
    return this._disabled;
  }

  set disabled(disabled: boolean) {
    this._disabled = disabled;
    this.stateChanges.next();
  }

  // placeholder accessor / mutator

  @Input() get placeholder(): string {
    return this._placeholder;
  }

  set placeholder(placeholder: string) {
    this._placeholder = placeholder;
    this.stateChanges.next();
  }

  // required accessor / mutator

  @Input() get required(): boolean {
    return this._required;
  }

  set required(required: boolean) {
    this._required = required;
    this.stateChanges.next();
  }

  // value accessor / mutator

  @Input() get value(): KeyValueType {
    if (this.asArray) {
      return Object.keys(this.keyValues).map(key => {
        return <KeyValueTuple>[key, this.keyValues[key]];
      });
    }
    else if (this.asArrayOfHashes) {
      return Object.keys(this.keyValues).map(key => {
        const k = this.asArrayOfHashes[0];
        const v = this.asArrayOfHashes[1];
        return <KeyValueHash>{ [k]: key, [v]: this.keyValues[key] };
      });
    }
    else if (this.asHash)
      return { ...this.keyValues };
  }

  set value(value: KeyValueType) {
    if (!value)
      this.keyValues = {} as KeyValueHash;
    else if (this.asArray) {
      this.keyValues = (<KeyValueArray>value).reduce((acc, tuple) => {
        acc[tuple[0]] = tuple[1];
        return acc;
      }, {} as KeyValueHash);
    }
    else if (this.asArrayOfHashes) {
      const k = this.asArrayOfHashes[0];
      const v = this.asArrayOfHashes[1];
      this.keyValues = (<KeyValueArrayOfHashes>value).reduce((acc, hash) => {
        acc[hash[k]] = hash[v];
        return acc;
      }, {} as KeyValueHash);
    }
    else if (this.asHash)
      this.keyValues = { ...<KeyValueHash>value };
    // we need the keys as an array for *ngFor
    this.keys = Object.keys(this.keyValues);
    // build the form dynamically
    Object.keys(this.keyValueForm.controls)
      .filter(key => key !== '$$newKey')
      .forEach(key => this.keyValueForm.removeControl(key));
    this.keys.forEach(key => {
      this.keyValueForm.addControl(key, new FormControl('', Validators.required));
    });
    this.keyValueForm.patchValue(this.keyValues);
    this.stateChanges.next();
  }

  private keyValues = {} as KeyValueHash;

  private _disabled: boolean;
  private _placeholder: string;
  private _required: boolean;

  /** ctor  */
  constructor(private formBuilder: FormBuilder) { 
    this.keyValueForm = this.formBuilder.group({ $$newKey: '' });
    this.keyValueForm.valueChanges.subscribe(v => console.log(v));
  }

  /** Add a new key */
  addKey(event: MouseEvent,
         key: string): void {
    this.value = { ...this.value, [key]: null};
    event.stopPropagation();
  }

  /** Delete a key */
  deleteKey(event: MouseEvent,
            key: string): void {
    const { [key]: gonzo, ...others } = this.value;
    this.value = others;
    event.stopPropagation();
  }

  /** @see MatFormFieldControl */
  onContainerClick(event: MouseEvent) { }

  /** @see MatFormFieldControl */
  setDescribedByIds(ids: string[]): void {
    this.describedBy = ids.join(' ');
  }

  // lifecycle methods

  ngOnDestroy(): void {
    this.stateChanges.complete();
  }

}
