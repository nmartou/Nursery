import { APP_LANGUAGE, type Language } from './language';

/**
 * Error messages written by the interface itself, by language. English is the
 * reference: every other language translates each of its keys. The messages
 * explaining a refusal of the API come from the API, already translated.
 */
const EN = {
  // --- API -------------------------------------------------------------------
  'api.unreachable': 'The server cannot be reached. Check that the backend is running.',
  'api.saveFailed': 'Saving failed, please try again.',

  // --- Form fields -----------------------------------------------------------
  'form.invalid': 'Some fields need to be corrected.',
  'field.firstNameRequired': 'The first name is required.',
  'field.lastNameRequired': 'The last name is required.',
  'field.birthDateRequired': 'The date of birth is required.',
  'field.startDateRequired': 'The start date is required.',
  'field.emailRequired': 'The email is required.',
  'field.emailInvalid': 'Invalid email address.',
  'field.phoneRequired': 'The phone number is required.',
  'field.phoneInvalid': 'Invalid phone number.',
  'field.firstDayRequired': 'The first day is required.',
  'field.lastDayRequired': 'The last day is required.',
  'field.lastDayBeforeFirst': 'The last day must follow the first one.',

  // --- Children --------------------------------------------------------------
  'children.loadFailed': 'The list of children could not be loaded.',
  'child.loadFailed': 'The registration of this child could not be loaded.',
  'child.startBeforeBirth': 'The enrollment cannot start before the birth.',
  'child.endBeforeStart': 'The end must be on or after the start.',
  'child.parentEmailsUnique': 'Each parent must have a different email.',
  'child.contactIncomplete': 'Every field of the contact is required (valid phone).',

  // --- Daily reports ---------------------------------------------------------
  'reports.loadFailed': "The day's reports could not be loaded.",
  'reports.weekend': 'The nursery is closed on weekends: choose a weekday.',
  'report.loadFailed': 'The report could not be loaded.',
  'report.stoolCommentRequired': 'A comment is required when the stools are not normal.',

  // --- Calendar --------------------------------------------------------------
  'calendar.loadFailed': 'The calendar could not be loaded.',
  'closure.labelRequired': 'The reason is required.',
  'absence.childRequired': 'Choose the child.',
  'absence.outsideEnrollment': 'The absence must be within the enrollment period.',

  // --- Dashboard -------------------------------------------------------------
  'dashboard.reportsLoadFailed': "The day's reports could not be loaded.",
} as const;

export type ErrorMessageKey = keyof typeof EN;

const FR: Record<ErrorMessageKey, string> = {
  'api.unreachable': "Impossible de joindre l'API. Vérifiez que le backend est démarré.",
  'api.saveFailed': "L'enregistrement a échoué, réessayez.",

  'form.invalid': 'Certains champs sont à corriger.',
  'field.firstNameRequired': 'Le prénom est obligatoire.',
  'field.lastNameRequired': 'Le nom est obligatoire.',
  'field.birthDateRequired': 'La date de naissance est obligatoire.',
  'field.startDateRequired': 'La date de début est obligatoire.',
  'field.emailRequired': "L'e-mail est obligatoire.",
  'field.emailInvalid': 'Adresse e-mail invalide.',
  'field.phoneRequired': 'Le téléphone est obligatoire.',
  'field.phoneInvalid': 'Numéro de téléphone invalide.',
  'field.firstDayRequired': 'Le premier jour est obligatoire.',
  'field.lastDayRequired': 'Le dernier jour est obligatoire.',
  'field.lastDayBeforeFirst': 'Le dernier jour doit suivre le premier.',

  'children.loadFailed': "La liste des enfants n'a pas pu être chargée.",
  'child.loadFailed': "Impossible de charger l'inscription de cet enfant.",
  'child.startBeforeBirth': "L'inscription ne peut pas commencer avant la naissance.",
  'child.endBeforeStart': 'La fin doit être le même jour ou après le début.',
  'child.parentEmailsUnique': 'Chaque parent doit avoir une adresse e-mail différente.',
  'child.contactIncomplete': 'Tous les champs du contact sont obligatoires (téléphone valide).',

  'reports.loadFailed': "Les rapports du jour n'ont pas pu être chargés.",
  'reports.weekend': 'La crèche est fermée le week-end : choisissez un jour de semaine.',
  'report.loadFailed': 'Impossible de charger le rapport.',
  'report.stoolCommentRequired':
    'Un commentaire est obligatoire si les selles ne sont pas normales.',

  'calendar.loadFailed': "Le calendrier n'a pas pu être chargé.",
  'closure.labelRequired': 'Le motif est obligatoire.',
  'absence.childRequired': "Choisissez l'enfant.",
  'absence.outsideEnrollment': "L'absence doit être comprise dans la période d'inscription.",

  'dashboard.reportsLoadFailed': 'Impossible de charger les rapports du jour.',
};

const CATALOGS: Record<Language, Record<ErrorMessageKey, string>> = { en: EN, fr: FR };

/** The error message in the language of the interface (or the given one). */
export function errorMessage(key: ErrorMessageKey, language: Language = APP_LANGUAGE): string {
  return CATALOGS[language][key];
}
