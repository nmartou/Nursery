import 'reflect-metadata';
import { Type, plainToInstance } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
  validate,
} from 'class-validator';
import { translate } from '../i18n/messages.js';
import {
  validationDetails,
  validationExceptionFactory,
} from './validation-exception.factory.js';

class Parent {
  @IsEmail()
  email: string;
}

class Form {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5)
  name: unknown;

  @IsDateString({ strict: true })
  date: unknown;

  @IsIn(['a', 'b'])
  kind: unknown;

  @IsInt()
  @Min(0)
  quantity: unknown;

  @IsBoolean()
  done: unknown;

  @IsUUID()
  id: unknown;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  tags: unknown;

  @IsNotEmpty({ message: 'validation.stoolCommentRequired' })
  reason: unknown;

  @ValidateNested({ each: true })
  @Type(() => Parent)
  parents: unknown;
}

const VALID = {
  name: 'Léa',
  date: '2026-10-20',
  kind: 'a',
  quantity: 1,
  done: true,
  id: '00000000-0000-4000-8000-000000000000',
  tags: ['x'],
  reason: 'Rendez-vous',
  parents: [{ email: 'claire@example.com' }],
};

/** The failed constraints, as French messages. */
async function messagesFor(values: Record<string, unknown>) {
  const errors = await validate(plainToInstance(Form, { ...VALID, ...values }));
  return validationDetails(errors).map((d) => translate('fr', d.code, d.params));
}

describe('validationExceptionFactory', () => {
  it('accepts a valid object', async () => {
    await expect(messagesFor({})).resolves.toEqual([]);
  });

  it.each([
    [{ name: '' }, '« name » est obligatoire.'],
    [{ name: 'Léa Martin' }, '« name » ne doit pas dépasser 5 caractères.'],
    [{ name: 12 }, '« name » doit être un texte.'],
    [{ date: '20/10/2026' }, '« date » doit être une date au format AAAA-MM-JJ.'],
    [{ kind: 'c' }, '« kind » contient une valeur non autorisée.'],
    [{ quantity: 1.5 }, '« quantity » doit être un nombre entier.'],
    [{ quantity: -1 }, '« quantity » doit être supérieur ou égal à 0.'],
    [{ done: 'yes' }, '« done » doit valoir vrai ou faux.'],
    [{ id: '12' }, '« id » doit être un identifiant valide.'],
    [{ tags: 'x' }, '« tags » doit être une liste.'],
    [{ tags: [] }, '« tags » doit contenir au moins 1 élément(s).'],
    [{ tags: ['x', 'y', 'z'] }, '« tags » ne doit pas contenir plus de 2 éléments.'],
  ])('translates %o', async (values, message) => {
    await expect(messagesFor(values)).resolves.toContain(message);
  });

  it('names the nested property that failed', async () => {
    await expect(
      messagesFor({ parents: [VALID.parents[0], { email: 'claire' }] }),
    ).resolves.toEqual([
      '« parents.1.email » doit être une adresse e-mail valide.',
    ]);
  });

  it('uses the message key given by the DTO', async () => {
    await expect(messagesFor({ reason: '' })).resolves.toEqual([
      "Précisez l'aspect des selles quand elles ne sont pas normales.",
    ]);
  });

  it('falls back to a generic key for an unknown constraint', () => {
    expect(
      validationDetails([
        {
          property: 'code',
          constraints: { isPostalCode: 'code must be a postal code' },
          children: [],
        },
      ]),
    ).toEqual([{ code: 'validation.invalid', params: { field: 'code' } }]);
  });

  it('builds a 400 with one detail per failed constraint', async () => {
    const errors = await validate(
      plainToInstance(Form, { ...VALID, name: '', kind: 'c' }),
    );
    const exception = validationExceptionFactory(errors);
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toEqual({
      code: 'validation.failed',
      details: [
        { code: 'validation.isNotEmpty', params: { field: 'name' } },
        { code: 'validation.isIn', params: { field: 'kind' } },
      ],
    });
  });
});
