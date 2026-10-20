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
import {
  validationExceptionFactory,
  validationMessages,
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

  @IsNotEmpty({ message: 'Précisez la raison.' })
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

async function messagesFor(values: Record<string, unknown>) {
  const errors = await validate(plainToInstance(Form, { ...VALID, ...values }));
  return validationMessages(errors);
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

  it('keeps the messages written in the DTO', async () => {
    await expect(messagesFor({ reason: '' })).resolves.toEqual([
      'Précisez la raison.',
    ]);
  });

  it('keeps a DTO message that happens to contain the property name', () => {
    expect(
      validationMessages([
        {
          property: 'phone',
          constraints: { matches: 'Le numéro de téléphone est invalide.' },
          children: [],
        },
      ]),
    ).toEqual(['Le numéro de téléphone est invalide.']);
  });

  it('falls back to a generic wording for an unknown constraint', () => {
    expect(
      validationMessages([
        {
          property: 'code',
          constraints: { isPostalCode: 'code must be a postal code' },
          children: [],
        },
      ]),
    ).toEqual(['« code » est invalide.']);
  });

  it('builds a 400 with every message', async () => {
    const errors = await validate(
      plainToInstance(Form, { ...VALID, name: '', kind: 'c' }),
    );
    const exception = validationExceptionFactory(errors);
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toMatchObject({
      message: [
        '« name » est obligatoire.',
        '« kind » contient une valeur non autorisée.',
      ],
    });
  });
});
