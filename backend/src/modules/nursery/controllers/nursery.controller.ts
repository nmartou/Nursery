import { Controller, Get } from '@nestjs/common';
import { NurseryResponseDto } from '../dtos/nursery-response.dto.js';
import { NurseryService } from '../services/nursery.service.js';

@Controller('nursery')
export class NurseryController {
  constructor(private readonly nurseryService: NurseryService) {}

  @Get()
  getCurrent(): Promise<NurseryResponseDto> {
    return this.nurseryService.getCurrent();
  }
}
