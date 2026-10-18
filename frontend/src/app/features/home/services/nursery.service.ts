import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Nursery } from '../models/nursery.model';

@Injectable({ providedIn: 'root' })
export class NurseryService {
  private readonly api = inject(ApiService);

  getCurrent(): Observable<Nursery> {
    return this.api.get<Nursery>('nursery');
  }
}
