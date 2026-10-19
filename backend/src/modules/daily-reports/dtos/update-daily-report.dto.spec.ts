import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
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
});
