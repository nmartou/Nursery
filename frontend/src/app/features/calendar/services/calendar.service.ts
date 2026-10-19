import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import type {
  Absence,
  AbsencePayload,
  CalendarResponse,
  ChildOption,
  Closure,
  ClosurePayload,
} from '../models/calendar.model';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly api = inject(ApiService);

  /** Holidays, closures, absences, arrivals and departures, bounds included. */
  getEvents(from: string, to: string): Observable<CalendarResponse> {
    return this.api.get<CalendarResponse>('calendar', { from, to });
  }

  createClosure(payload: ClosurePayload): Observable<Closure> {
    return this.api.post<Closure>('closures', payload);
  }

  updateClosure(id: string, payload: ClosurePayload): Observable<Closure> {
    return this.api.put<Closure>(`closures/${id}`, payload);
  }

  deleteClosure(id: string): Observable<void> {
    return this.api.delete(`closures/${id}`);
  }

  createAbsence(payload: AbsencePayload): Observable<Absence> {
    return this.api.post<Absence>('absences', payload);
  }

  updateAbsence(id: string, payload: AbsencePayload): Observable<Absence> {
    return this.api.put<Absence>(`absences/${id}`, payload);
  }

  deleteAbsence(id: string): Observable<void> {
    return this.api.delete(`absences/${id}`);
  }

  /** Children an absence can be declared for. */
  listChildren(): Observable<ChildOption[]> {
    return this.api.get<{ children: ChildOption[] }>('children').pipe(map((list) => list.children));
  }
}
