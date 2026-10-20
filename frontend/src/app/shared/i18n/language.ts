/** Languages the interface can be shown in; English is the fallback. */
export type Language = 'en' | 'fr';

/**
 * Language of the interface. It is also sent to the API (`Accept-Language`) so
 * that its error messages match.
 */
export const APP_LANGUAGE: Language = 'fr';
