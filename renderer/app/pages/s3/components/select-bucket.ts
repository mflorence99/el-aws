import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { Descriptor } from '../state/s3';
import { ElementRef } from '@angular/core';
import { FocusMonitor } from '@angular/cdk/a11y';
import { FormBuilder } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { HostBinding } from '@angular/core';
import { Input } from '@angular/core';
import { MatFormFieldControl } from '@angular/material';
import { NgControl } from '@angular/forms';
import { Observable } from 'rxjs/Observable';
import { OnDestroy } from '@angular/core';
import { Optional } from '@angular/core';
import { S3State } from '../state/s3';
import { Select } from '@ngxs/store';
import { Self } from '@angular/core';
import { Subject } from 'rxjs';

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { config } from '../../../config';
import { debounceTime } from 'rxjs/operators';
import { filter } from 'rxjs/operators';
import { tap } from 'rxjs/operators';

/**
 * Use <mat-select> to pick a bucket
 *
 * NOTE: quite complicated to follow Angular Material custom control spec
 *
 * @see https://material.angular.io/guide/creating-a-custom-form-field-control
 */

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'elaws-select-bucket',
  templateUrl: 'select-bucket.html',
  styleUrls: ['select-bucket.scss']
})

export class SelectBucketComponent implements ControlValueAccessor,
                                              MatFormFieldControl<string>,
                                              OnDestroy {

  static nextID = 0;

  @HostBinding('attr.aria-describedby') describedBy = '';
  @HostBinding() id = `my-tel-input-${SelectBucketComponent.nextID++}`;

  @Select(S3State.getBuckets) buckets$: Observable<Descriptor[]>;

  // @see MatFormFieldControl
  controlType = 'elaws-select-bucket';
  focused = false;
  shouldLabelFloat = false;
  stateChanges = new Subject<void>();

  selectBucketForm: FormGroup;

  // disabled accessor / mutator

  @Input() get disabled(): boolean {
    return this._disabled;
  }

  set disabled(disabled: boolean) {
    this._disabled = coerceBooleanProperty(disabled);
    this.stateChanges.next();
  }

  // empty accessor

  get empty(): boolean {
    return !this.selectBucketForm.value.selectBucket;
  }

  // errorState accessor

  get errorState(): boolean {
    return this.selectBucketForm.invalid;
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

  @Input() get value(): string {
    return this.selectBucketForm.value.selectBucket;
  }

  set value(value: string) {
    this.selectBucketForm.setValue({ selectBucket: value });
    this.stateChanges.next();
  }

  private onChange: Function;

  private _disabled: boolean;
  private _placeholder: string;
  private _required: boolean;

  /** ctor  */
  constructor(private element: ElementRef,
              private focusMonitor: FocusMonitor,
              private formBuilder: FormBuilder,
              @Optional() @Self() public ngControl: NgControl) {
    this.selectBucketForm = this.formBuilder.group({
      selectBucket: ''
    });
    if (this.ngControl != null)
      this.ngControl.valueAccessor = this;
    // monitor for value
    this.selectBucketForm.valueChanges
      .pipe(
        tap(values => {
          if (this.errorState)
            this.ngControl.control.setErrors({ 'invalid': true });
        }),
        filter(values => !this.errorState),
        debounceTime(config.componentOnChangeThrottle)
      ).subscribe(values => {
        if (this.onChange)
          this.onChange(this.value);
        this.stateChanges.next();
      });
    // monitor for focus
    this.focusMonitor.monitor(this.element.nativeElement, true)
      .subscribe(origin => {
        this.focused = !!origin;
        this.stateChanges.next();
      });
  }

  /** @see MatFormFieldControl */
  onContainerClick(event: MouseEvent) { }

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

  ngOnDestroy(): void {
    this.stateChanges.complete();
    this.focusMonitor.stopMonitoring(this.element.nativeElement);
  }

}
