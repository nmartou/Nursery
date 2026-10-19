import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { REPORT_SUMMARIES } from '../../testing/daily-report.fixtures';
import { ReportList } from './report-list';

describe('ReportList', () => {
  let fixture: ComponentFixture<ReportList>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ReportList] }).compileComponents();
    fixture = TestBed.createComponent(ReportList);
    fixture.componentRef.setInput('reports', REPORT_SUMMARIES);
    fixture.componentRef.setInput('selectedId', 'r2');
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  });

  it('renders one row per child with a status indicator', () => {
    const rows = element.querySelectorAll('.row');
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('Léa');
    expect(rows[0].querySelector('.badge--complete')?.textContent).toContain('Complet');
    expect(rows[1].querySelector('.badge--in_progress')?.textContent).toContain('À compléter');
    expect(rows[2].querySelector('.badge--todo')?.textContent).toContain('À remplir');
  });

  it('shows the last modification time and counts remaining reports', () => {
    expect(element.querySelector('.row__time')?.textContent).toMatch(/Modifié à \d{2}:\d{2}/);
    expect(element.querySelector('.list__summary')?.textContent).toContain('2 rapports');
  });

  it('highlights the selected row and emits the clicked report id', () => {
    const emitted: string[] = [];
    fixture.componentInstance.selectReport.subscribe((id) => emitted.push(id));

    const rows = element.querySelectorAll<HTMLButtonElement>('.row');
    expect(rows[1].classList).toContain('row--selected');

    rows[2].click();
    expect(emitted).toEqual(['r3']);
  });
});
