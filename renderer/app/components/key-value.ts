import { AfterViewInit } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { ContentChild } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { ElementRef } from '@angular/core';
import { ErrorStateMatcher } from '@angular/material';
import { FocusMonitor } from '@angular/cdk/a11y';
import { FormBuilder } from '@angular/forms';
import { FormControl } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { FormGroupDirective } from '@angular/forms';
import { HostBinding } from '@angular/core';
import { Input } from '@angular/core';
import { MatFormFieldControl } from '@angular/material';
import { NgControl } from '@angular/forms';
import { NgForm } from '@angular/forms';
import { OnDestroy } from '@angular/core';
import { Optional } from '@angular/core';
import { Self } from '@angular/core';
import { Subject } from 'rxjs';
import { TemplateRef } from '@angular/core';
import { Validators } from '@angular/forms';
import { ViewChild } from '@angular/core';

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { config } from '../config';
import { debounceTime } from 'rxjs/operators';
import { filter } from 'rxjs/operators';
import { isObjectEmpty } from 'ellib';
import { tap } from 'rxjs/operators';

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
 * 
 * NOTE: quite complicated to follow Angular Material custom control spec
 * 
 * @see https://material.angular.io/guide/creating-a-custom-form-field-control
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: MatFormFieldControl, useExisting: KeyValueComponent }],
  selector: 'elaws-key-value',
  styleUrls: ['key-value.scss'],
  templateUrl: 'key-value.html'
})

export class KeyValueComponent implements ControlValueAccessor,
                                          MatFormFieldControl<KeyValueType>, 
                                          AfterViewInit, OnDestroy { 

  static nextID = 0;

  @ContentChild('keyIcon') keyIcon: TemplateRef<any>;
  @ContentChild('valueIcon') valueIcon: TemplateRef<any>;

  @HostBinding('attr.aria-describedby') describedBy = '';
  @HostBinding() id = `my-tel-input-${KeyValueComponent.nextID++}`;

  @Input() asArray = false;
  @Input() asArrayOfHashes: KeyValueTuple;
  @Input() asHash = true;
  @Input() duplicateKeyMessage: string;

  @ViewChild('newKey') newKey: ElementRef;

  // @see MatFormFieldControl
  controlType = 'elaws-key-value';
  empty = false;
  focused = false;
  shouldLabelFloat = false;
  stateChanges = new Subject<void>();

  duplicateKey: boolean;

  errorStateMatcher = new KeyValueErrorStateMatcher();

  keys: string[] = [];
  keyValueForm: FormGroup;

  // disabled accessor / mutator

  @Input() get disabled(): boolean {
    return this._disabled;
  }

  set disabled(disabled: boolean) {
    this._disabled = coerceBooleanProperty(disabled);
    this.stateChanges.next();
  }

  // errorState accessor

  get errorState(): boolean {
    return this.keyValueForm.invalid || (this.required && isObjectEmpty(this.keyValues));
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
    this._required = coerceBooleanProperty(required);
    this.stateChanges.next();
  }

  // value accessor / mutator

  @Input() get value(): KeyValueType {
    return this.toKeyValueType();
  }

  set value(value: KeyValueType) {
    this.fromKeyValueType(value);
    this.buildForm();
    this.stateChanges.next();
  }

  private keyValues = {} as KeyValueHash;

  private onChange: Function;

  private _disabled: boolean;
  private _placeholder: string;
  private _required: boolean;

  /** ctor  */
  constructor(private focusMonitor: FocusMonitor,
              private formBuilder: FormBuilder,
              @Optional() @Self() public ngControl: NgControl) { 
    this.keyValueForm = this.formBuilder.group({ });
    if (this.ngControl != null)
      this.ngControl.valueAccessor = this;
  }

  /** Add a new key */
  addKey(key: string): void {
    if (!this.disabled && key) {
      // NOTE: guarded because we are not using real buttons due to submit issues
      if (!this.keyValues[key]) {
        this.keyValues[key] = null;
        this.buildForm();
        this.stateChanges.next();
        this.newKey.nativeElement.value = '';
      }
      else this.duplicateKey = true;
    }
  }

  /** Delete a key */
  deleteKey(key: string): void {
    if (!this.disabled) {
      // NOTE: guarded because we are not using real buttons due to submit issues
      delete this.keyValues[key]; 
      this.buildForm();
      this.stateChanges.next();
    }
  }

  /** @see MatFormFieldControl */
  /** @see https://material.angular.io/guide/creating-a-custom-form-field-control */
  onContainerClick(event: MouseEvent) { 
    const tagName = (<Element>event.target).tagName.toLowerCase();
    if (['input', 'a'].includes(tagName))
      this.newKey.nativeElement.focus();
  }

  /** @see ControlValueAccessor */
  registerOnChange(fn): void {
    this.onChange = fn;
  }

  /** @see ControlValueAccessor */
  registerOnTouched(fn): void { }

  /** @see MatFormFieldControl */
  setDescribedByIds(ids: string[]): void {
    this.describedBy = ids.join(' ');
  }

  /** @see ControlValueAccessor */
  writeValue(value): void {
    this.value = value;
  }

  // lifecycle methods

  ngAfterViewInit(): void {
    // monitor for value
    this.keyValueForm.valueChanges
      .pipe(
        tap(values => {
          if (this.errorState)
            this.ngControl.control.setErrors({ 'invalid': true });
        }),
        filter(values => !this.errorState),
        debounceTime(config.keyValueComponentThrottle)
      ).subscribe(values => {
        this.duplicateKey = false;
        this.keys.forEach(key => this.keyValues[key] = values[key]);
        this.onChange(this.value);
        this.stateChanges.next();
      });
    // monitor for focus
    this.focusMonitor.monitor(this.newKey.nativeElement, true)
      .subscribe(origin => {
        this.focused = !!origin;
        this.stateChanges.next();
      });
  }

  ngOnDestroy(): void {
    this.stateChanges.complete();
    this.focusMonitor.stopMonitoring(this.newKey.nativeElement);
  }

  // private methods

  private buildForm(): void {
    // we need the keys as an array for *ngFor
    this.keys = Object.keys(this.keyValues);
    // build the form dynamically
    Object.keys(this.keyValueForm.controls)
      .forEach(key => this.keyValueForm.removeControl(key));
    this.keys.forEach(key => {
      const field = { value: this.keyValues[key], disabled: this.disabled };
      const control = new FormControl(field, Validators.required);
      this.keyValueForm.addControl(key, control);
    });
  }

  private fromKeyValueType(value: KeyValueType): void {
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
  }

  private toKeyValueType(): KeyValueType {
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

}

/**
 * Custom error state matcher
 */

export class KeyValueErrorStateMatcher implements ErrorStateMatcher {

  // @see ErrorStateMatcher
  isErrorState(control: FormControl | null,
               form: FormGroupDirective | NgForm | null): boolean {
    return !!(control && control.invalid);
  }

}
