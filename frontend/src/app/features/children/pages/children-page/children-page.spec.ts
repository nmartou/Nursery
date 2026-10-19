import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { buildChild, CHILD_LIST } from '../../testing/child.fixtures';
import { ChildrenPage } from './children-page';

const API = `${environment.apiUrl}/children`;

/**
 * jsdom does not implement modal dialogs: a minimal stand-in that toggles `open`
 * and fires `close` like a browser. Playwright covers the real behaviour.
 */
function stubDialog(): void {
  const proto = HTMLDialogElement.prototype as Partial<HTMLDialogElement>;
  proto.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close ??= function (this: HTMLDialogElement) {
    if (this.hasAttribute('open')) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    }
  };
}

describe('ChildrenPage (integration)', () => {
  let fixture: ComponentFixture<ChildrenPage>;
  let element: HTMLElement;
  let http: HttpTestingController;

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    stubDialog();
    await TestBed.configureTestingModule({
      imports: [ChildrenPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ChildrenPage);
    element = fixture.nativeElement as HTMLElement;
    await render();
    http.expectOne(API).flush(CHILD_LIST);
    await render();
  });

  afterEach(() => http.verify());

  const names = () =>
    [...element.querySelectorAll('.row__name')].map((name) => name.textContent?.trim());
  const dialog = () => element.querySelector('dialog') as HTMLDialogElement;
  const buttonByText = (text: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    );

  it('lists the enrolled children by default, with a count per filter', () => {
    expect(names()).toEqual(['Léa Martin', 'Hugo Bernard']);
    const filters = [...element.querySelectorAll('.filters__item')].map((f) =>
      f.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(filters).toEqual(['Inscrits 2', 'À venir 1', 'Anciens 1', 'Tous 4']);
  });

  it('filters by enrollment status', async () => {
    buttonByText('À venir')?.click();
    await render();
    expect(names()).toEqual(['Émma Moreau']);
    buttonByText('Tous')?.click();
    await render();
    expect(names()).toHaveLength(4);
  });

  it('searches a name, ignoring accents and case', async () => {
    buttonByText('Tous')?.click();
    const search = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'EMMA';
    search.dispatchEvent(new Event('input'));
    await render();
    expect(names()).toEqual(['Émma Moreau']);
  });

  it('opens an empty form in a modal dialog for a new child', async () => {
    expect(dialog().open).toBe(false);
    buttonByText('Inscrire un enfant')?.click();
    await render();
    expect(dialog().open).toBe(true);
    expect(dialog().querySelector('#child-form-title')?.textContent).toContain(
      'Nouvelle inscription',
    );

    buttonByText('Annuler')?.click();
    await render();
    expect(dialog().open).toBe(false);
  });

  it('opens the form of a child, saves it, then refreshes the list', async () => {
    element.querySelector<HTMLButtonElement>('.row')?.click();
    http.expectOne(`${API}/c1`).flush(buildChild());
    await render();
    expect(dialog().open).toBe(true);

    dialog().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await render();
    const put = http.expectOne((req) => req.method === 'PUT' && req.url === `${API}/c1`);
    put.flush(buildChild({ enrollmentStatus: 'ended' }));
    await render();

    expect(dialog().open).toBe(false);
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      "L'inscription de Léa Martin est enregistrée.",
    );
    // The filter follows the saved child, then the list is reloaded.
    expect(element.querySelector('.filters__item--active')?.textContent).toContain('Anciens');
    http.expectOne(API).flush(CHILD_LIST);
    await render();
  });

  it('keeps the dialog open and explains a refused save', async () => {
    element.querySelector<HTMLButtonElement>('.row')?.click();
    http.expectOne(`${API}/c1`).flush(buildChild());
    await render();

    dialog().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await render();
    http
      .expectOne(`${API}/c1`)
      .flush({ message: ['…'] }, { status: 400, statusText: 'Bad Request' });
    await render();

    expect(dialog().open).toBe(true);
    expect(dialog().querySelector('[role="alert"]')?.textContent).toContain(
      'Certaines informations sont refusées',
    );
  });

  it('closes without asking when only empty rows were added', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    buttonByText('Inscrire un enfant')?.click();
    await render();
    buttonByText('+ Ajouter un parent')?.click();
    buttonByText('+ Ajouter un contact')?.click();
    await render();

    buttonByText('Annuler')?.click();
    await render();
    expect(confirm).not.toHaveBeenCalled();
    expect(dialog().open).toBe(false);
    confirm.mockRestore();
  });

  it('asks before closing a form with unsaved changes', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    buttonByText('Inscrire un enfant')?.click();
    await render();

    const firstName = dialog().querySelector<HTMLInputElement>('[formcontrolname="firstName"]')!;
    firstName.value = 'Tom';
    firstName.dispatchEvent(new Event('input'));
    await render();

    // Escape key: the browser fires "cancel" on the dialog.
    dialog().dispatchEvent(new Event('cancel', { cancelable: true }));
    await render();
    expect(confirm).toHaveBeenCalled();
    expect(dialog().open).toBe(true);

    confirm.mockReturnValue(true);
    buttonByText('Annuler')?.click();
    await render();
    expect(dialog().open).toBe(false);
    confirm.mockRestore();
  });
});
