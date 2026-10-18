import { toIsoString } from '../../../common/utils/date.util.js';
import { NurseryResponseDto } from '../dtos/nursery-response.dto.js';
import { Nursery } from '../models/nursery.model.js';

export class NurseryMapper {
  static toResponseDto(nursery: Nursery): NurseryResponseDto {
    return {
      id: nursery.id,
      name: nursery.name,
      address: nursery.address,
      capacity: nursery.capacity,
      createdAt: toIsoString(nursery.createdAt),
    };
  }
}
