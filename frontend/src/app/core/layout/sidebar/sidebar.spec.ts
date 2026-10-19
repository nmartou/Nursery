import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('collapses and expands when the toggle button is clicked', async () => {
    const fixture = TestBed.createComponent(Sidebar);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const aside = element.querySelector('.sidebar')!;
    const toggle = element.querySelector<HTMLButtonElement>('.sidebar__toggle')!;

    expect(aside.classList).not.toContain('sidebar--collapsed');
    expect(element.textContent).toContain('Accueil');

    toggle.click();
    await fixture.whenStable();
    expect(aside.classList).toContain('sidebar--collapsed');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.sidebar__link')?.textContent).not.toContain('Accueil');

    toggle.click();
    await fixture.whenStable();
    expect(aside.classList).not.toContain('sidebar--collapsed');
  });
});
