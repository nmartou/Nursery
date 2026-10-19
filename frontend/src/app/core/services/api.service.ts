import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { buildUrl } from '../../shared/utils/url.utils';

export type QueryParams = Record<string, string | number | boolean>;

/**
 * Thin wrapper around HttpClient that prefixes every call with the API base URL.
 * Future cross-cutting concerns (JWT header, error mapping) belong in interceptors.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http.get<T>(buildUrl(environment.apiUrl, path), { params });
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(buildUrl(environment.apiUrl, path), body);
  }
}
