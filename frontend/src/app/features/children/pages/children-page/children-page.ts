import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
  type OnInit,
} from '@angular/core';
import { ModalDialog } from '../../../../shared/components/modal-dialog/modal-dialog';
import { httpErrorMessage } from '../../../../shared/utils/http-error.utils';
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
  imports: [ChildList, ChildForm, ModalDialog],
  templateUrl: './children-page.html',
  styleUrl: './children-page.scss',
})
export class ChildrenPage implements OnInit {
  private readonly childrenService = inject(ChildrenService);
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
      error: (error: unknown) => this.error.set(httpErrorMessage(error, 'child.loadFailed')),
    });
  }

  protected requestClose(): void {
    if (!this.childForm()?.isDirty() || window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      this.editing.set(null);
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
        this.saveError.set(httpErrorMessage(error, 'api.saveFailed'));
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
      error: (error: unknown) => {
        this.error.set(httpErrorMessage(error, 'children.loadFailed'));
        this.loading.set(false);
      },
    });
  }
}
