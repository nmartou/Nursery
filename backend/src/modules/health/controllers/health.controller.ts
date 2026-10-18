import { Controller, Get } from '@nestjs/common';
import { toIsoString } from '../../../common/utils/date.util.js';
import { HealthResponseDto } from '../dtos/health-response.dto.js';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponseDto {
    return { status: 'ok', timestamp: toIsoString(new Date()) };
  }
}
