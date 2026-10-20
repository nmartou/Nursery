/**
 * Messages shown to the end user, by language. English is the reference (and
 * the fallback): every other language translates each of its keys. `{name}`
 * placeholders are replaced by the parameters of the message.
 */
const EN = {
  // --- Requests --------------------------------------------------------------
  'request.invalid': 'The request was refused.',
  'request.notFound': 'This resource does not exist.',
  'request.invalidId': 'This identifier is not valid.',
  'route.notFound': 'This address does not exist: {method} {path}.',
  'body.invalidJson': 'The body of the request is not valid JSON.',
  'body.tooLarge': 'The request is too large.',
  'body.unsupportedEncoding': 'The encoding of the request is not supported.',
  'server.unexpected': 'An unexpected error occurred. Please try again later.',

  // --- Database --------------------------------------------------------------
  'database.unavailable':
    'The database is unavailable. Please try again in a moment.',
  'database.duplicate': 'This information is already saved.',
  'database.missingReference':
    'This change refers to data that no longer exists. Reload the page.',
  'database.invalidValue': 'Some of the values are not allowed.',

  // --- Validation ------------------------------------------------------------
  'validation.failed': 'Some of the information is not valid.',
  'validation.isNotEmpty': '"{field}" is required.',
  'validation.isString': '"{field}" must be a text.',
  'validation.maxLength': '"{field}" must not exceed {n} characters.',
  'validation.isDateString': '"{field}" must be a date formatted as YYYY-MM-DD.',
  'validation.isIn': '"{field}" contains a value that is not allowed.',
  'validation.isInt': '"{field}" must be a whole number.',
  'validation.min': '"{field}" must be greater than or equal to {n}.',
  'validation.isBoolean': '"{field}" must be true or false.',
  'validation.isArray': '"{field}" must be a list.',
  'validation.arrayMinSize': '"{field}" must contain at least {n} item(s).',
  'validation.arrayMaxSize': '"{field}" must not contain more than {n} items.',
  'validation.isUuid': '"{field}" must be a valid identifier.',
  'validation.isEmail': '"{field}" must be a valid email address.',
  'validation.nestedValidation': '"{field}" must be an object.',
  'validation.invalid': '"{field}" is not valid.',
  'validation.phone':
    'A phone number may only contain digits, spaces and + ( ) . -.',
  'validation.time': 'Times must be formatted as HH:mm (e.g. 08:30).',
  'validation.periodEndBeforeStart': 'The end of the period must follow its start.',
  'validation.closureEndBeforeStart':
    'The last day of the closure must follow the first one.',
  'validation.absenceEndBeforeStart':
    'The last day of the absence must follow the first one.',
  'validation.enrollmentBeforeBirth':
    'The enrollment cannot start before the birth.',
  'validation.enrollmentEndBeforeStart':
    'The end of the enrollment must follow its start.',
  'validation.parentRequired': 'At least one responsible parent is required.',
  'validation.parentEmailsUnique': 'Each parent must have a different email.',
  'validation.stoolCommentRequired':
    'Describe the stools when they are not normal.',

  // --- Children --------------------------------------------------------------
  'child.notFound': 'This child does not exist or was deleted.',

  // --- Daily reports ---------------------------------------------------------
  'report.notFound': 'This report does not exist.',
  'report.weekend': 'The nursery is closed on weekends.',

  // --- Calendar --------------------------------------------------------------
  'calendar.periodTooLong': 'The requested period cannot exceed one year.',
  'closure.notFound': 'This closure does not exist or was deleted.',
  'absence.notFound': 'This absence does not exist or was deleted.',
  'absence.unknownChild': 'This child does not exist.',
  'absence.outsideEnrollment':
    "The absence must be within the child's enrollment period.",
  'absence.overlap': 'An absence is already planned for this child over this period.',
} as const;

export type MessageKey = keyof typeof EN;

const FR: Record<MessageKey, string> = {
  'request.invalid': 'La requête a été refusée.',
  'request.notFound': "Cette ressource n'existe pas.",
  'request.invalidId': "Cet identifiant n'est pas valide.",
  'route.notFound': "Cette adresse n'existe pas : {method} {path}.",
  'body.invalidJson': "Le corps de la requête n'est pas un JSON valide.",
  'body.tooLarge': 'La requête est trop volumineuse.',
  'body.unsupportedEncoding': "L'encodage de la requête n'est pas pris en charge.",
  'server.unexpected': 'Une erreur inattendue est survenue. Réessayez plus tard.',

  'database.unavailable':
    'La base de données est indisponible. Réessayez dans un instant.',
  'database.duplicate': 'Ces informations sont déjà enregistrées.',
  'database.missingReference':
    "Cette modification concerne des données qui n'existent plus. Rechargez la page.",
  'database.invalidValue': 'Certaines valeurs ne sont pas autorisées.',

  'validation.failed': 'Certaines informations ne sont pas valides.',
  'validation.isNotEmpty': '« {field} » est obligatoire.',
  'validation.isString': '« {field} » doit être un texte.',
  'validation.maxLength': '« {field} » ne doit pas dépasser {n} caractères.',
  'validation.isDateString':
    '« {field} » doit être une date au format AAAA-MM-JJ.',
  'validation.isIn': '« {field} » contient une valeur non autorisée.',
  'validation.isInt': '« {field} » doit être un nombre entier.',
  'validation.min': '« {field} » doit être supérieur ou égal à {n}.',
  'validation.isBoolean': '« {field} » doit valoir vrai ou faux.',
  'validation.isArray': '« {field} » doit être une liste.',
  'validation.arrayMinSize': '« {field} » doit contenir au moins {n} élément(s).',
  'validation.arrayMaxSize':
    '« {field} » ne doit pas contenir plus de {n} éléments.',
  'validation.isUuid': '« {field} » doit être un identifiant valide.',
  'validation.isEmail': '« {field} » doit être une adresse e-mail valide.',
  'validation.nestedValidation': '« {field} » doit être un objet.',
  'validation.invalid': "« {field} » n'est pas valide.",
  'validation.phone':
    'Le numéro de téléphone ne peut contenir que des chiffres, des espaces et + ( ) . -.',
  'validation.time': 'Les heures doivent être au format HH:mm (ex. 08:30).',
  'validation.periodEndBeforeStart': 'La fin de la période doit suivre son début.',
  'validation.closureEndBeforeStart':
    'Le dernier jour de fermeture doit suivre le premier.',
  'validation.absenceEndBeforeStart':
    "Le dernier jour d'absence doit suivre le premier.",
  'validation.enrollmentBeforeBirth':
    "La date d'inscription ne peut pas précéder la naissance.",
  'validation.enrollmentEndBeforeStart': "La fin d'inscription doit suivre le début.",
  'validation.parentRequired': 'Au moins un parent responsable est requis.',
  'validation.parentEmailsUnique':
    'Chaque parent doit avoir une adresse e-mail différente.',
  'validation.stoolCommentRequired':
    "Précisez l'aspect des selles quand elles ne sont pas normales.",

  'child.notFound': "Cet enfant n'existe pas ou a été supprimé.",

  'report.notFound': "Ce rapport n'existe pas.",
  'report.weekend': 'La crèche est fermée le week-end.',

  'calendar.periodTooLong': 'La période demandée ne peut pas dépasser un an.',
  'closure.notFound': "Cette fermeture n'existe pas ou a été supprimée.",
  'absence.notFound': "Cette absence n'existe pas ou a été supprimée.",
  'absence.unknownChild': "Cet enfant n'existe pas.",
  'absence.outsideEnrollment':
    "L'absence doit être comprise dans la période d'inscription de l'enfant.",
  'absence.overlap': 'Une absence est déjà prévue pour cet enfant sur cette période.',
};

export const LANGUAGES = ['en', 'fr'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'en';

const CATALOGS: Record<Language, Record<MessageKey, string>> = { en: EN, fr: FR };

export type MessageParams = Record<string, string | number>;

export function isMessageKey(value: unknown): value is MessageKey {
  return typeof value === 'string' && Object.hasOwn(EN, value);
}

/** The message in the given language, its `{placeholders}` filled in. */
export function translate(
  language: Language,
  key: MessageKey,
  params: MessageParams = {},
): string {
  return CATALOGS[language][key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}

/**
 * The supported language preferred by an `Accept-Language` header
 * (`fr-FR,fr;q=0.9,en;q=0.8`), or English when none is supported.
 */
export function languageFrom(acceptLanguage: string | undefined): Language {
  const preferences = (acceptLanguage ?? '')
    .split(',')
    .map((part, index) => {
      const [tag, ...options] = part.trim().split(';');
      const quality = options
        .map((option) => /^\s*q=([\d.]+)\s*$/.exec(option)?.[1])
        .find((q) => q !== undefined);
      return {
        language: tag.split('-')[0].toLowerCase(),
        quality: quality === undefined ? 1 : Number(quality),
        index,
      };
    })
    .filter((p) => p.quality > 0)
    .sort((a, b) =>
      b.quality !== a.quality ? b.quality - a.quality : a.index - b.index,
    );
  const supported = preferences.find((p) =>
    (LANGUAGES as readonly string[]).includes(p.language),
  );
  return (supported?.language as Language | undefined) ?? DEFAULT_LANGUAGE;
}
