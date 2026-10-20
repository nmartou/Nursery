import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorCode, httpErrorMessage, isApiErrorBody } from './http-error.utils';

const apiError = (status: number, body: unknown) =>
  new HttpErrorResponse({ status, error: body, url: '/api/absences' });

const OVERLAP = {
  statusCode: 409,
  error: 'Conflict',
  code: 'absence.overlap',
  messages: ['Une absence est déjà prévue pour cet enfant sur cette période.'],
  path: '/api/absences',
  timestamp: '2026-10-20T08:00:00.000Z',
};

describe('http error utils', () => {
  it('says when the server cannot be reached', () => {
    expect(httpErrorMessage(apiError(0, new ProgressEvent('error')), 'api.saveFailed')).toBe(
      "Impossible de joindre l'API. Vérifiez que le backend est démarré.",
    );
  });

  it('shows what the API explained, every message', () => {
    expect(httpErrorMessage(apiError(409, OVERLAP), 'api.saveFailed')).toBe(
      'Une absence est déjà prévue pour cet enfant sur cette période.',
    );
    expect(
      httpErrorMessage(
        apiError(400, { ...OVERLAP, messages: ['« label » est obligatoire.', 'Trop long.'] }),
        'api.saveFailed',
      ),
    ).toBe('« label » est obligatoire. Trop long.');
  });

  it.each([
    ['an empty body', null],
    ['a body from another server', '<html>Bad gateway</html>'],
    ['the former nested format', { message: { message: 'Ancien format' } }],
    ['no message', { ...OVERLAP, messages: [] }],
    ['messages that are not texts', { ...OVERLAP, messages: [12] }],
  ])('falls back to its own message for %s', (_, body) => {
    expect(httpErrorMessage(apiError(502, body), 'report.loadFailed')).toBe(
      'Impossible de charger le rapport.',
    );
  });

  it('falls back to its own message for an error that is not HTTP', () => {
    expect(httpErrorMessage(new Error('boom'), 'api.saveFailed')).toBe(
      "L'enregistrement a échoué, réessayez.",
    );
  });

  it('reads the code of an API error', () => {
    expect(apiErrorCode(apiError(409, OVERLAP))).toBe('absence.overlap');
    expect(apiErrorCode(apiError(500, null))).toBeNull();
    expect(apiErrorCode('boom')).toBeNull();
    expect(isApiErrorBody(OVERLAP)).toBe(true);
    expect(isApiErrorBody({ code: 'x' })).toBe(false);
  });
});
