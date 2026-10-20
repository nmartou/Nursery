import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { SaveAbsenceDto } from '../dtos/save-absence.dto.js';
import type { SaveClosureDto } from '../dtos/save-closure.dto.js';
import type {
  Absence,
  Closure,
  EnrollmentBound,
  ReportedAbsence,
} from '../models/calendar.model.js';
import type { CalendarRepository } from '../repositories/calendar.repository.js';
import { CalendarService } from './calendar.service.js';

const CLOSURE: Closure = {
  id: 'cl1',
  startDate: '2026-11-09',
  endDate: '2026-11-10',
  label: 'Pont du 11 novembre',
};

const ABSENCE: Absence = {
  id: 'a1',
  childId: 'c1',
  childFirstName: 'Léa',
  childLastName: 'Martin',
  startDate: '2026-11-16',
  endDate: '2026-11-18',
  kind: 'sickness',
  comment: 'Otite',
};

const REPORTED: ReportedAbsence = {
  reportId: 'r1',
  childId: 'c2',
  childFirstName: 'Hugo',
  childLastName: 'Bernard',
  date: '2026-11-03',
  comment: null,
};

const START: EnrollmentBound = {
  childId: 'c3',
  childFirstName: 'Emma',
  childLastName: 'Petit',
  date: '2026-11-02',
};

const END: EnrollmentBound = { ...START, date: '2026-11-27' };

const CLOSURE_DTO: SaveClosureDto = {
  startDate: CLOSURE.startDate,
  endDate: CLOSURE.endDate,
  label: CLOSURE.label,
};

const ABSENCE_DTO: SaveAbsenceDto = {
  childId: 'c1',
  startDate: '2026-11-16',
  endDate: '2026-11-18',
  kind: 'sickness',
  comment: 'Otite',
};

function createRepositoryMock() {
  return {
    findClosuresBetween: vi.fn(() => Promise.resolve([CLOSURE])),
    findAbsencesBetween: vi.fn(() => Promise.resolve([ABSENCE])),
    findReportedAbsencesBetween: vi.fn(() => Promise.resolve([REPORTED])),
    findEnrollmentStartsBetween: vi.fn(() => Promise.resolve([START])),
    findEnrollmentEndsBetween: vi.fn(() => Promise.resolve([END])),
    createClosure: vi.fn(() => Promise.resolve(CLOSURE)),
    updateClosure: vi.fn(
      (id: string): Promise<Closure | null> =>
        Promise.resolve(id === CLOSURE.id ? CLOSURE : null),
    ),
    deleteClosure: vi.fn((id: string) => Promise.resolve(id === CLOSURE.id)),
    findAbsenceById: vi.fn(
      (id: string): Promise<Absence | null> =>
        Promise.resolve(id === ABSENCE.id ? ABSENCE : null),
    ),
    findEnrollment: vi.fn(
      (
        childId: string,
      ): Promise<{ start: string; end: string | null } | null> =>
        Promise.resolve(
          childId === 'c1' ? { start: '2026-09-01', end: '2027-07-30' } : null,
        ),
    ),
    hasOverlappingAbsence: vi.fn(() => Promise.resolve(false)),
    createAbsence: vi.fn(() => Promise.resolve(ABSENCE)),
    updateAbsence: vi.fn(
      (id: string): Promise<Absence | null> =>
        Promise.resolve(id === ABSENCE.id ? ABSENCE : null),
    ),
    deleteAbsence: vi.fn((id: string) => Promise.resolve(id === ABSENCE.id)),
  };
}

describe('CalendarService', () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let service: CalendarService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new CalendarService(repository as unknown as CalendarRepository);
  });

  describe('events', () => {
    it('gathers every source of the period, sorted by date', async () => {
      const { from, to, events } = await service.events(
        '2026-11-01',
        '2026-11-30',
      );

      expect({ from, to }).toEqual({ from: '2026-11-01', to: '2026-11-30' });
      expect(events.map((e) => [e.startDate, e.type])).toEqual([
        ['2026-11-01', 'public_holiday'],
        ['2026-11-02', 'enrollment_start'],
        ['2026-11-03', 'reported_absence'],
        ['2026-11-09', 'closure'],
        ['2026-11-11', 'public_holiday'],
        ['2026-11-16', 'absence'],
        ['2026-11-27', 'enrollment_end'],
      ]);
      for (const query of [
        repository.findClosuresBetween,
        repository.findAbsencesBetween,
        repository.findReportedAbsencesBetween,
        repository.findEnrollmentStartsBetween,
        repository.findEnrollmentEndsBetween,
      ]) {
        expect(query).toHaveBeenCalledWith('2026-11-01', '2026-11-30');
      }
    });

    it('keeps the ids of the editable events only', async () => {
      const { events } = await service.events('2026-11-01', '2026-11-30');
      const sourceIds = Object.fromEntries(
        events.map((e) => [e.key, e.sourceId]),
      );

      expect(sourceIds).toMatchObject({
        'closure-cl1': 'cl1',
        'absence-a1': 'a1',
        'reported_absence-r1': null,
        'enrollment_start-c3': null,
      });
    });

    it('accepts a year and refuses a longer period without querying', async () => {
      await expect(
        service.events('2026-01-01', '2026-12-31'),
      ).resolves.toBeDefined();

      repository.findClosuresBetween.mockClear();
      await expect(
        service.events('2026-01-01', '2027-03-01'),
      ).rejects.toMatchObject({
        status: 400,
        response: { code: 'calendar.periodTooLong' },
      });
      expect(repository.findClosuresBetween).not.toHaveBeenCalled();
    });
  });

  describe('closures', () => {
    it('creates a closure from the label and the dates only', async () => {
      const extra = { ...CLOSURE_DTO, id: 'ignored' } as SaveClosureDto;
      await expect(service.createClosure(extra)).resolves.toEqual(CLOSURE);
      expect(repository.createClosure).toHaveBeenCalledWith(CLOSURE_DTO);
    });

    it('updates a closure, or throws NotFound', async () => {
      await expect(
        service.updateClosure('cl1', CLOSURE_DTO),
      ).resolves.toEqual(CLOSURE);
      await expect(
        service.updateClosure('unknown', CLOSURE_DTO),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes a closure, or throws NotFound', async () => {
      await expect(service.deleteClosure('cl1')).resolves.toBeUndefined();
      await expect(service.deleteClosure('unknown')).rejects.toMatchObject({
        response: { code: 'closure.notFound' },
      });
    });
  });

  describe('absences', () => {
    it('saves an absence within the enrollment, an empty comment as none', async () => {
      await expect(
        service.createAbsence({ ...ABSENCE_DTO, comment: '' }),
      ).resolves.toEqual(ABSENCE);
      expect(repository.createAbsence).toHaveBeenCalledWith({
        ...ABSENCE_DTO,
        comment: null,
      });
    });

    it('accepts any date after the start of an open-ended enrollment', async () => {
      repository.findEnrollment.mockResolvedValueOnce({
        start: '2026-09-01',
        end: null,
      });
      await expect(
        service.createAbsence({
          ...ABSENCE_DTO,
          startDate: '2030-01-07',
          endDate: '2030-01-08',
        }),
      ).resolves.toEqual(ABSENCE);
    });

    it('refuses an unknown child', async () => {
      await expect(
        service.createAbsence({ ...ABSENCE_DTO, childId: 'unknown' }),
      ).rejects.toMatchObject({ response: { code: 'absence.unknownChild' } });
      expect(repository.createAbsence).not.toHaveBeenCalled();
    });

    it.each([
      ['before the enrollment', '2026-08-31', '2026-09-01'],
      ['after the enrollment', '2027-07-30', '2027-07-31'],
    ])('refuses an absence %s', async (_, startDate, endDate) => {
      await expect(
        service.createAbsence({ ...ABSENCE_DTO, startDate, endDate }),
      ).rejects.toMatchObject({
        status: 400,
        response: { code: 'absence.outsideEnrollment' },
      });
      expect(repository.createAbsence).not.toHaveBeenCalled();
    });

    it('accepts an absence on the first and last days of the enrollment', async () => {
      await service.createAbsence({
        ...ABSENCE_DTO,
        startDate: '2026-09-01',
        endDate: '2027-07-30',
      });
      expect(repository.createAbsence).toHaveBeenCalled();
    });

    it('refuses an absence overlapping another one of the child', async () => {
      repository.hasOverlappingAbsence.mockResolvedValueOnce(true);
      await expect(service.createAbsence(ABSENCE_DTO)).rejects.toBeInstanceOf(
        ConflictException,
      );
      repository.hasOverlappingAbsence.mockResolvedValueOnce(true);
      await expect(service.createAbsence(ABSENCE_DTO)).rejects.toMatchObject({
        response: { code: 'absence.overlap' },
      });
      expect(repository.createAbsence).not.toHaveBeenCalled();
    });

    it('ignores the absence itself when looking for an overlap on update', async () => {
      await expect(service.updateAbsence('a1', ABSENCE_DTO)).resolves.toEqual(
        ABSENCE,
      );
      expect(repository.hasOverlappingAbsence).toHaveBeenCalledWith(
        expect.objectContaining({ childId: 'c1' }),
        'a1',
      );
      expect(repository.updateAbsence).toHaveBeenCalledWith('a1', ABSENCE_DTO);
    });

    it('throws NotFound for an unknown absence before any check', async () => {
      await expect(
        service.updateAbsence('unknown', ABSENCE_DTO),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.findEnrollment).not.toHaveBeenCalled();
    });

    it('throws NotFound when the absence disappears while being updated', async () => {
      repository.updateAbsence.mockResolvedValueOnce(null);
      await expect(
        service.updateAbsence('a1', ABSENCE_DTO),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes an absence, or throws NotFound', async () => {
      await expect(service.deleteAbsence('a1')).resolves.toBeUndefined();
      await expect(service.deleteAbsence('unknown')).rejects.toMatchObject({
        response: { code: 'absence.notFound' },
      });
    });
  });
});
