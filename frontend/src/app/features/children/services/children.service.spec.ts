import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { buildChild } from '../testing/child.fixtures';
import { toPayload, toFormValue } from '../utils/child-form.utils';
import { ChildrenService } from './children.service';

const API = `${environment.apiUrl}/children`;

describe('ChildrenService', () => {
  let service: ChildrenService;
  let http: HttpTestingController;
  const payload = toPayload(toFormValue(buildChild()));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChildrenService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists and reads children', () => {
    service.list().subscribe();
    service.getById('c1').subscribe();
    expect(http.expectOne(API).request.method).toBe('GET');
    expect(http.expectOne(`${API}/c1`).request.method).toBe('GET');
  });

  it('creates a child with POST and updates one with PUT', () => {
    service.create(payload).subscribe();
    service.update('c1', payload).subscribe();

    const created = http.expectOne((req) => req.method === 'POST' && req.url === API);
    expect(created.request.body).toBe(payload);
    const updated = http.expectOne((req) => req.method === 'PUT' && req.url === `${API}/c1`);
    expect(updated.request.body).toBe(payload);
  });
});
