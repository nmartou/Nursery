import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { languageInterceptor } from './language.interceptor';

describe('languageInterceptor', () => {
  it('sends the language of the interface with every request', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([languageInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('/api/children').subscribe({ next: () => undefined, error: () => undefined });

    const request = controller.expectOne('/api/children');
    expect(request.request.headers.get('Accept-Language')).toBe('fr');
    request.flush([]);
    controller.verify();
  });
});
