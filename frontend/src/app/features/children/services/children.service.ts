import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import type { Child, ChildList, ChildPayload } from '../models/child.model';

@Injectable({ providedIn: 'root' })
export class ChildrenService {
  private readonly api = inject(ApiService);

  list(): Observable<ChildList> {
    return this.api.get<ChildList>('children');
  }

  getById(id: string): Observable<Child> {
    return this.api.get<Child>(`children/${id}`);
  }

  create(payload: ChildPayload): Observable<Child> {
    return this.api.post<Child>('children', payload);
  }

  update(id: string, payload: ChildPayload): Observable<Child> {
    return this.api.put<Child>(`children/${id}`, payload);
  }
}
