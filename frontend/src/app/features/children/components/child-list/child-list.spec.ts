import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { CHILD_SUMMARIES, TODAY } from '../../testing/child.fixtures';
import { ChildList } from './child-list';

describe('ChildList', () => {
  let fixture: ComponentFixture<ChildList>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ChildList] }).compileComponents();
    fixture = TestBed.createComponent(ChildList);
    fixture.componentRef.setInput('children', CHILD_SUMMARIES);
    fixture.componentRef.setInput('today', TODAY);
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  });

  const rows = () => [...element.querySelectorAll<HTMLButtonElement>('.row')];

  it('shows each child with its age, enrollment period and status', () => {
    expect(rows()).toHaveLength(4);
    const [lea, hugo, emma, lucas] = rows();
    expect(lea.textContent).toContain('Léa');
    expect(lea.querySelector('.row__meta')?.textContent).toContain('2 ans');
    expect(lea.querySelector('.row__period')?.textContent).toContain('Du 01/09/2026 au 30/07/2027');
    expect(hugo.querySelector('.row__period')?.textContent).toContain('Depuis le 01/09/2026');
    expect(hugo.querySelector('.row__meta')?.textContent).toContain('21 mois');
    expect(emma.querySelector('.badge--upcoming')?.textContent).toContain('À venir');
    expect(lucas.querySelector('.badge--ended')?.textContent).toContain('Terminé');
  });

  it('shows the parents and the number of other contacts', () => {
    const lea = rows()[0];
    expect(lea.querySelector('.row__parents')?.textContent).toContain('Claire Martin');
    expect(lea.querySelector('.row__parents')?.textContent).toContain('(Mère)');
    expect(lea.querySelector('.row__parents')?.textContent).toContain('+ 2 contacts');
    expect(rows()[1].textContent).not.toContain('contact');
  });

  it('emits the id of the clicked child', () => {
    const emitted: string[] = [];
    fixture.componentInstance.selectChild.subscribe((id) => emitted.push(id));
    rows()[2].click();
    expect(emitted).toEqual(['c3']);
  });

  it('flags the children absent today, with the reason when it is known', async () => {
    const today = { startDate: TODAY, endDate: TODAY, comment: null };
    fixture.componentRef.setInput('children', [
      {
        ...CHILD_SUMMARIES[0],
        currentAbsence: { ...today, id: 'a1', kind: 'sickness', source: 'calendar' },
      },
      {
        ...CHILD_SUMMARIES[1],
        currentAbsence: { ...today, id: 'report-r1', kind: null, source: 'report' },
      },
    ]);
    await fixture.whenStable();
    const [lea, hugo] = rows();
    expect(lea.querySelector('.row__absent')?.textContent?.trim()).toBe(
      "Absent aujourd'hui · Maladie",
    );
    expect(hugo.querySelector('.row__absent')?.textContent?.trim()).toBe("Absent aujourd'hui");
  });

  it('says so when no child matches', async () => {
    fixture.componentRef.setInput('children', []);
    await fixture.whenStable();
    expect(element.querySelector('.list__empty')?.textContent).toContain('Aucun enfant');
  });
});
