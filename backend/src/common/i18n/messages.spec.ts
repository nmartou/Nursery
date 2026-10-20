import {
  DEFAULT_LANGUAGE,
  isMessageKey,
  languageFrom,
  translate,
} from './messages.js';

describe('messages', () => {
  describe('translate', () => {
    it('gives the message in the requested language', () => {
      expect(translate('fr', 'child.notFound')).toBe(
        "Cet enfant n'existe pas ou a été supprimé.",
      );
      expect(translate('en', 'child.notFound')).toBe(
        'This child does not exist or was deleted.',
      );
    });

    it('fills in the placeholders, and leaves the unknown ones', () => {
      expect(
        translate('fr', 'validation.maxLength', { field: 'label', n: 100 }),
      ).toBe('« label » ne doit pas dépasser 100 caractères.');
      expect(translate('en', 'validation.maxLength', { field: 'label' })).toBe(
        '"label" must not exceed {n} characters.',
      );
    });
  });

  it('recognizes the keys of the catalog only', () => {
    expect(isMessageKey('absence.overlap')).toBe(true);
    expect(isMessageKey('absence.unknown')).toBe(false);
    expect(isMessageKey('toString')).toBe(false);
    expect(isMessageKey(12)).toBe(false);
  });

  describe('languageFrom', () => {
    it.each([
      ['fr-FR,fr;q=0.9,en;q=0.8', 'fr'],
      ['en-GB,en;q=0.9,fr;q=0.8', 'en'],
      ['FR', 'fr'],
      // The preferred supported language, whatever the order.
      ['de;q=0.9,en;q=0.5,fr;q=0.7', 'fr'],
      // Same quality: the first one.
      ['fr, en', 'fr'],
      // Unsupported or refused languages.
      ['de-DE,es', 'en'],
      ['fr;q=0', 'en'],
      ['*', 'en'],
      ['', 'en'],
    ])('reads %j as %s', (header, language) => {
      expect(languageFrom(header)).toBe(language);
    });

    it('falls back to English without the header', () => {
      expect(DEFAULT_LANGUAGE).toBe('en');
      expect(languageFrom(undefined)).toBe('en');
    });
  });
});
