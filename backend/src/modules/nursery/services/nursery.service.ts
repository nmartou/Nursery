import { Inject, Injectable } from '@nestjs/common';
import { NURSERY_REPOSITORY } from '../../../common/constants/injection-tokens.js';
import { NurseryResponseDto } from '../dtos/nursery-response.dto.js';
import { NurseryMapper } from '../mappers/nursery.mapper.js';
import type { NurseryRepository } from '../repositories/nursery.repository.js';

@Injectable()
export class NurseryService {
  constructor(
    @Inject(NURSERY_REPOSITORY)
    private readonly nurseryRepository: NurseryRepository,
  ) {}

  async getCurrent(): Promise<NurseryResponseDto> {
    const nursery = await this.nurseryRepository.findCurrent();
    return NurseryMapper.toResponseDto(nursery);
  }
}
