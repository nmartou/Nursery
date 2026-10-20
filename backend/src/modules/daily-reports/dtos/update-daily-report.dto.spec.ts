import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { translate } from '../../../common/i18n/messages.js';
import { validationDetails } from '../../../common/validation/validation-exception.factory.js';
import { EMPTY_REPORT_CONTENT } from '../testing/daily-report.fixtures.js';
import { UpdateDailyReportDto } from './update-daily-report.dto.js';

async function errorsFor(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(UpdateDailyReportDto, {
    ...EMPTY_REPORT_CONTENT,
    ...payload,
  });
  const errors = await validate(dto);
  return errors.map((error) => error.property);
}

async function messagesFor(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(UpdateDailyReportDto, {
    ...EMPTY_REPORT_CONTENT,
    ...payload,
  });
  return validationDetails(await validate(dto)).map((d) =>
    translate('fr', d.code, d.params),
  );
}

describe('UpdateDailyReportDto', () => {
  it('accepts an empty report', async () => {
    expect(await errorsFor({})).toEqual([]);
  });

  it('requires a stool comment when stools are not normal', async () => {
    expect(await errorsFor({ stoolStatus: 'other' })).toEqual(['stoolComment']);
    expect(
      await errorsFor({ stoolStatus: 'other', stoolComment: 'Liquides' }),
    ).toEqual([]);
  });

  it('rejects malformed times', async () => {
    expect(await errorsFor({ arrivalTime: '8h00' })).toEqual(['arrivalTime']);
    expect(
      await errorsFor({ bottles: [{ time: '25:00', quantityMl: 120 }] }),
    ).toEqual(['bottles']);
  });

  it('rejects negative quantities and unknown stool statuses', async () => {
    expect(
      await errorsFor({ meals: [{ label: 'Purée', quantityGrams: -5 }] }),
    ).toEqual(['meals']);
    expect(await errorsFor({ stoolStatus: 'weird' })).toEqual(['stoolStatus']);
  });

  it('explains the refused stool comment and times in French', async () => {
    await expect(messagesFor({ stoolStatus: 'other', stoolComment: '' })).resolves.toEqual([
      "Précisez l'aspect des selles quand elles ne sont pas normales.",
    ]);
    await expect(
      messagesFor({ naps: [{ startTime: '13h', endTime: null }] }),
    ).resolves.toEqual(['Les heures doivent être au format HH:mm (ex. 08:30).']);
  });
});
