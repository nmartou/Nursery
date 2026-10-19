import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  signal,
  viewChild,
  type OnInit,
} from '@angular/core';
import { ChildForm } from '../../components/child-form/child-form';
import { ChildList } from '../../components/child-list/child-list';
import { ENROLLMENT_FILTERS } from '../../constants/child.constants';
import type {
  Child,
  ChildList as ChildListModel,
  ChildPayload,
  EnrollmentStatus,
} from '../../models/child.model';
import { ChildrenService } from '../../services/children.service';

type Filter = EnrollmentStatus | 'all';

/** The form shown in the dialog: a new registration (`child` null) or an edition. */
interface Editing {
  child: Child | null;
}

const UNSAVED_CHANGES_MESSAGE =
  'Des modifications ne sont pas enregistrées et seront perdues. Continuer ?';

/** Accents and case do not matter when searching a name. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

@Component({
  selector: 'app-children-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChildList, ChildForm],
  templateUrl: './children-page.html',
  styleUrl: './children-page.scss',
})
export class ChildrenPage implements OnInit {
  private readonly childrenService = inject(ChildrenService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly childForm = viewChild(ChildForm);

  protected readonly list = signal<ChildListModel | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filter = signal<Filter>('enrolled');
  protected readonly search = signal('');
  protected readonly notice = signal<string | null>(null);

  protected readonly editing = signal<Editing | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly filters = computed(() => {
    const children = this.list()?.children ?? [];
    return ENROLLMENT_FILTERS.map((filter) => ({
      ...filter,
      count:
        filter.value === 'all'
          ? children.length
          : children.filter((child) => child.enrollmentStatus === filter.value).length,
    }));
  });

  protected readonly visibleChildren = computed(() => {
    const filter = this.filter();
    const search = normalize(this.search().trim());
    return (this.list()?.children ?? []).filter(
      (child) =>
        (filter === 'all' || child.enrollmentStatus === filter) &&
        normalize(`${child.firstName} ${child.lastName}`).includes(search),
    );
  });

  constructor() {
    // The dialog follows the `editing` state (opened modal, so the page behind is inert).
    // After rendering, so that the form is in the DOM when it gets the focus.
    afterRenderEffect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.editing() && !dialog.open) {
        dialog.showModal();
        // Start on the first field rather than on the close button.
        dialog.querySelector<HTMLInputElement>('input')?.focus();
      } else if (!this.editing() && dialog.open) {
        dialog.close();
      }
    });

    // A click on the dimmed backdrop closes the dialog. Mouse only: keyboard users
    // have Escape (the `cancel` event), hence a listener instead of a template binding.
    afterNextRender(() => {
      this.dialog().nativeElement.addEventListener('click', (event) => this.onDialogClick(event));
    });
  }

  ngOnInit(): void {
    this.load();
  }

  protected openNew(): void {
    this.saveError.set(null);
    this.notice.set(null);
    this.editing.set({ child: null });
  }

  protected openEdit(id: string): void {
    this.saveError.set(null);
    this.notice.set(null);
    this.childrenService.getById(id).subscribe({
      next: (child) => this.editing.set({ child }),
      error: () => this.error.set("Impossible de charger l'inscription de cet enfant."),
    });
  }

  protected requestClose(): void {
    if (!this.childForm()?.isDirty() || window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      this.editing.set(null);
    }
  }

  /** Escape key: the dialog only closes if no change would be lost. */
  protected onCancel(event: Event): void {
    event.preventDefault();
    this.requestClose();
  }

  /** The click landed on the dialog element itself, i.e. on its backdrop. */
  private onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.requestClose();
    }
  }

  /** Closed by the browser itself: keep the state in sync. */
  protected onClosed(): void {
    this.editing.set(null);
  }

  protected save(payload: ChildPayload): void {
    const current = this.editing();
    if (!current) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    const request = current.child
      ? this.childrenService.update(current.child.id, payload)
      : this.childrenService.create(payload);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.editing.set(null);
        // Show the saved child, whatever the filter was.
        if (this.filter() !== 'all') {
          this.filter.set(saved.enrollmentStatus);
        }
        this.notice.set(
          current.child
            ? `L'inscription de ${saved.firstName} ${saved.lastName} est enregistrée.`
            : `${saved.firstName} ${saved.lastName} est inscrit(e).`,
        );
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.saveError.set(
          error instanceof HttpErrorResponse && error.status === 400
            ? 'Certaines informations sont refusées : vérifiez le formulaire.'
            : "L'enregistrement a échoué, réessayez.",
        );
      },
    });
  }

  private load(): void {
    this.error.set(null);
    this.childrenService.list().subscribe({
      next: (list) => {
        this.list.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Impossible de joindre l'API. Vérifiez que le backend est démarré.");
        this.loading.set(false);
      },
    });
  }
}
