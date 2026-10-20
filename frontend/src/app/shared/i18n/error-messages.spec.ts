import { errorMessage } from './error-messages';
import { APP_LANGUAGE } from './language';

describe('errorMessage', () => {
  it('speaks the language of the interface by default', () => {
    expect(APP_LANGUAGE).toBe('fr');
    expect(errorMessage('field.firstNameRequired')).toBe('Le prénom est obligatoire.');
  });

  it('gives the message in another language', () => {
    expect(errorMessage('field.firstNameRequired', 'en')).toBe('The first name is required.');
  });
});
