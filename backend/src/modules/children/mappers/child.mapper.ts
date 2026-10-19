import { toIsoString } from '../../../common/utils/date.util.js';
import type { ChildResponseDto } from '../dtos/child-response.dto.js';
import type { ChildSummaryDto } from '../dtos/child-summary.dto.js';
import type { SaveChildDto } from '../dtos/save-child.dto.js';
import type { Child, ChildInput } from '../models/child.model.js';
import {
  absenceHistory,
  currentAbsence,
} from '../utils/absence-history.util.js';
import { computeEnrollmentStatus } from '../utils/enrollment-status.util.js';

export class ChildMapper {
  static toInput(dto: SaveChildDto): ChildInput {
    return {
      firstName: dto.firstName,
      lastName: dto.lastName,
      birthDate: dto.birthDate,
      enrollmentStart: dto.enrollmentStart,
      enrollmentEnd: dto.enrollmentEnd ?? null,
      parents: dto.parents.map((parent) => ({
        firstName: parent.firstName,
        lastName: parent.lastName,
        // Emails identify parents: compare and store them in lower case.
        email: parent.email.toLowerCase(),
        phone: parent.phone,
        relationship: parent.relationship,
      })),
      contacts: dto.contacts.map((contact) => ({
        firstName: contact.firstName,
        lastName: contact.lastName,
        relationship: contact.relationship,
        phone: contact.phone,
      })),
    };
  }

  static toResponseDto(child: Child, today: string): ChildResponseDto {
    return {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      birthDate: child.birthDate,
      enrollmentStart: child.enrollmentStart,
      enrollmentEnd: child.enrollmentEnd,
      enrollmentStatus: computeEnrollmentStatus(child, today),
      parents: child.parents.map((parent) => ({ ...parent })),
      contacts: child.contacts.map((contact) => ({ ...contact })),
      absences: absenceHistory(child.absences, child.reportedAbsences),
      createdAt: toIsoString(child.createdAt),
      updatedAt: toIsoString(child.updatedAt),
    };
  }

  static toSummaryDto(child: Child, today: string): ChildSummaryDto {
    return {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      birthDate: child.birthDate,
      enrollmentStart: child.enrollmentStart,
      enrollmentEnd: child.enrollmentEnd,
      enrollmentStatus: computeEnrollmentStatus(child, today),
      parents: child.parents.map(
        ({ firstName, lastName, relationship, phone }) => ({
          firstName,
          lastName,
          relationship,
          phone,
        }),
      ),
      contactCount: child.contacts.length,
      currentAbsence: currentAbsence(
        absenceHistory(child.absences, child.reportedAbsences),
        today,
      ),
      updatedAt: toIsoString(child.updatedAt),
    };
  }
}
