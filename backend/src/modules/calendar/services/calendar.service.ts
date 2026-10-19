import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { publicHolidaysBetween } from '../../../common/utils/public-holidays.util.js';
import type {
  AbsenceResponseDto,
  CalendarResponseDto,
  ClosureResponseDto,
} from '../dtos/calendar-response.dto.js';
import type { SaveAbsenceDto } from '../dtos/save-absence.dto.js';
import type { SaveClosureDto } from '../dtos/save-closure.dto.js';
import { CalendarMapper } from '../mappers/calendar.mapper.js';
import type { AbsenceInput } from '../models/calendar.model.js';
import { CalendarRepository } from '../repositories/calendar.repository.js';

/** Longest period one request may cover (a year, plus the weeks around it). */
const MAX_PERIOD_DAYS = 400;

function daysBetween(from: string, to: string): number {
  return (
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
    86_400_000
  );
}

@Injectable()
export class CalendarService {
  constructor(private readonly repository: CalendarRepository) {}

  /**
   * Everything happening over a period: closures, absences (planned in the
   * calendar or noted in the daily reports), arrivals and departures.
   */
  async events(from: string, to: string): Promise<CalendarResponseDto> {
    if (daysBetween(from, to) > MAX_PERIOD_DAYS) {
      throw new BadRequestException(
        'La période demandée ne peut pas dépasser un an.',
      );
    }
    const [closures, absences, reported, starts, ends] = await Promise.all([
      this.repository.findClosuresBetween(from, to),
      this.repository.findAbsencesBetween(from, to),
      this.repository.findReportedAbsencesBetween(from, to),
      this.repository.findEnrollmentStartsBetween(from, to),
      this.repository.findEnrollmentEndsBetween(from, to),
    ]);
    const events = CalendarMapper.sort([
      ...publicHolidaysBetween(from, to).map((h) => CalendarMapper.holiday(h)),
      ...closures.map((closure) => CalendarMapper.closure(closure)),
      ...absences.map((absence) => CalendarMapper.absence(absence)),
      ...reported.map((absence) => CalendarMapper.reportedAbsence(absence)),
      ...starts.map((s) => CalendarMapper.enrollment(s, 'enrollment_start')),
      ...ends.map((e) => CalendarMapper.enrollment(e, 'enrollment_end')),
    ]);
    return { from, to, events };
  }

  // --- Closures ------------------------------------------------------------

  async createClosure(dto: SaveClosureDto): Promise<ClosureResponseDto> {
    const closure = await this.repository.createClosure(this.closureInput(dto));
    return CalendarMapper.toClosureDto(closure);
  }

  async updateClosure(
    id: string,
    dto: SaveClosureDto,
  ): Promise<ClosureResponseDto> {
    const closure = await this.repository.updateClosure(
      id,
      this.closureInput(dto),
    );
    if (!closure) {
      throw new NotFoundException(`Closure ${id} not found`);
    }
    return CalendarMapper.toClosureDto(closure);
  }

  async deleteClosure(id: string): Promise<void> {
    if (!(await this.repository.deleteClosure(id))) {
      throw new NotFoundException(`Closure ${id} not found`);
    }
  }

  // --- Absences --------------------------------------------------------------

  async createAbsence(dto: SaveAbsenceDto): Promise<AbsenceResponseDto> {
    const input = CalendarMapper.toAbsenceInput(dto);
    await this.checkAbsence(input);
    return CalendarMapper.toAbsenceDto(
      await this.repository.createAbsence(input),
    );
  }

  async updateAbsence(
    id: string,
    dto: SaveAbsenceDto,
  ): Promise<AbsenceResponseDto> {
    if (!(await this.repository.findAbsenceById(id))) {
      throw new NotFoundException(`Absence ${id} not found`);
    }
    const input = CalendarMapper.toAbsenceInput(dto);
    await this.checkAbsence(input, id);
    const absence = await this.repository.updateAbsence(id, input);
    if (!absence) {
      throw new NotFoundException(`Absence ${id} not found`);
    }
    return CalendarMapper.toAbsenceDto(absence);
  }

  async deleteAbsence(id: string): Promise<void> {
    if (!(await this.repository.deleteAbsence(id))) {
      throw new NotFoundException(`Absence ${id} not found`);
    }
  }

  private closureInput(dto: SaveClosureDto) {
    return { startDate: dto.startDate, endDate: dto.endDate, label: dto.label };
  }

  /** An absence belongs to an existing child, within its enrollment, without overlap. */
  private async checkAbsence(
    input: AbsenceInput,
    exceptId?: string,
  ): Promise<void> {
    const enrollment = await this.repository.findEnrollment(input.childId);
    if (!enrollment) {
      throw new BadRequestException("Cet enfant n'existe pas.");
    }
    const withinEnrollment =
      input.startDate >= enrollment.start &&
      (enrollment.end === null || input.endDate <= enrollment.end);
    if (!withinEnrollment) {
      throw new BadRequestException(
        "L'absence doit être comprise dans la période d'inscription de l'enfant.",
      );
    }
    if (await this.repository.hasOverlappingAbsence(input, exceptId)) {
      throw new ConflictException(
        'Une absence est déjà prévue pour cet enfant sur cette période.',
      );
    }
  }
}
