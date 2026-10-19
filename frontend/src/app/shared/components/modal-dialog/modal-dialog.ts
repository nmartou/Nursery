import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * A native modal `<dialog>`: the page behind is dimmed, blurred and inert.
 * The parent owns the state: `open` shows or hides it, and the component only
 * *asks* to close (`closeRequested`) on Escape or a click on the backdrop, so
 * that the parent can protect unsaved changes first.
 *
 * ```html
 * <app-modal-dialog [open]="editing() !== null" labelledBy="form-title"
 *                   (closeRequested)="requestClose()" (closed)="editing.set(null)">
 *   @if (editing(); as editing) { <app-my-form … /> }
 * </app-modal-dialog>
 * ```
 */
@Component({
  selector: 'app-modal-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      [class]="'modal modal--' + size()"
      [attr.aria-labelledby]="labelledBy()"
      (cancel)="onCancel($event)"
      (close)="closed.emit()"
    >
      <ng-content />
    </dialog>
  `,
  styleUrl: './modal-dialog.scss',
})
export class ModalDialog {
  readonly open = input(false);
  /** Id of the element naming the dialog (its title). */
  readonly labelledBy = input<string>();
  /** Width on large screens: `large` for long forms, `medium` for short ones. */
  readonly size = input<'medium' | 'large'>('large');
  /** Escape or a click on the backdrop: the parent decides whether to close. */
  readonly closeRequested = output<void>();
  /** The dialog was closed (by the parent, or by the browser itself). */
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    // After rendering, so that the projected content is in the DOM when it gets the focus.
    afterRenderEffect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        dialog.showModal();
        // Start on the first field rather than on the close button.
        dialog.querySelector<HTMLElement>('input, select, textarea')?.focus();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });

    // Mouse only: keyboard users have Escape (the `cancel` event), hence a
    // listener instead of a template binding.
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      dialog.addEventListener('click', (event) => {
        // The click landed on the dialog element itself, i.e. on its backdrop.
        if (event.target === dialog) {
          this.closeRequested.emit();
        }
      });
    });
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.closeRequested.emit();
  }
}
