import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SAVE_CHILD_PAYLOAD } from '../testing/child.fixtures.js';
import { SaveChildDto } from './save-child.dto.js';

async function errorsFor(payload: Record<string, unknown>) {
  const dto = plainToInstance(SaveChildDto, {
    ...SAVE_CHILD_PAYLOAD,
    ...payload,
  });
  const errors = await validate(dto);
  return errors.map((error) => ({
    property: error.property,
    messages: Object.values(error.constraints ?? {}),
  }));
}

const parent = SAVE_CHILD_PAYLOAD.parents[0];

describe('SaveChildDto', () => {
  it('accepts a complete registration, with or without an end date', async () => {
    expect(await errorsFor({})).toEqual([]);
    expect(await errorsFor({ enrollmentEnd: '2027-07-30' })).toEqual([]);
  });

  it('accepts an enrollment ending on its first day', async () => {
    expect(await errorsFor({ enrollmentEnd: '2026-09-01' })).toEqual([]);
  });

  it('rejects an end date before the start, with a French message', async () => {
    expect(await errorsFor({ enrollmentEnd: '2026-08-31' })).toEqual([
      {
        property: 'enrollmentEnd',
        messages: ["La fin d'inscription doit suivre le début."],
      },
    ]);
  });

  it('rejects an enrollment starting before birth', async () => {
    const errors = await errorsFor({ birthDate: '2026-09-02' });
    expect(errors.map((e) => e.property)).toEqual(['enrollmentStart']);
  });

  it('requires at least one parent and distinct emails', async () => {
    expect((await errorsFor({ parents: [] }))[0].messages).toContain(
      'Au moins un parent responsable est requis.',
    );
    const twice = await errorsFor({
      parents: [parent, { ...parent, email: 'claire.MARTIN@example.com ' }],
    });
    expect(twice[0].messages).toContain(
      'Chaque parent doit avoir une adresse e-mail différente.',
    );
  });

  it('trims text before validating it', async () => {
    const dto = plainToInstance(SaveChildDto, {
      ...SAVE_CHILD_PAYLOAD,
      firstName: '  Léa ',
      parents: [{ ...parent, email: ' claire@example.com ' }],
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.firstName).toBe('Léa');
    expect(dto.parents[0].email).toBe('claire@example.com');

    expect((await errorsFor({ lastName: '   ' }))[0].property).toBe('lastName');
  });

  it('validates the parents and contacts themselves', async () => {
    const errors = await errorsFor({
      parents: [{ ...parent, email: 'not-an-email', phone: '12' }],
      contacts: [{ ...SAVE_CHILD_PAYLOAD.contacts[0], relationship: '' }],
    });
    expect(errors.map((e) => e.property)).toEqual(['parents', 'contacts']);
  });
});
