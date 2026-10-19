import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import type { Nursery } from '../models/nursery.model';

@Injectable({ providedIn: 'root' })
export class NurseryService {
  private readonly api = inject(ApiService);

  getCurrent(): Observable<Nursery> {
    return this.api.get<Nursery>('nursery');
  }
}
