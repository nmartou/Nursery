import { Injectable, NotFoundException } from '@nestjs/common';
import { toIsoDate } from '../../../common/utils/date.util.js';
import { ChildResponseDto } from '../dtos/child-response.dto.js';
import { ChildListResponseDto } from '../dtos/child-summary.dto.js';
import { SaveChildDto } from '../dtos/save-child.dto.js';
import { ChildMapper } from '../mappers/child.mapper.js';
import { ChildRepository } from '../repositories/child.repository.js';

const CHILD_NOT_FOUND = "Cet enfant n'existe pas ou a été supprimé.";

@Injectable()
export class ChildrenService {
  constructor(private readonly repository: ChildRepository) {}

  /** Every registered child, with its enrollment status as of today. */
  async list(now: Date = new Date()): Promise<ChildListResponseDto> {
    const today = toIsoDate(now);
    const children = await this.repository.findAll();
    return {
      today,
      children: children.map((child) => ChildMapper.toSummaryDto(child, today)),
    };
  }

  async getById(id: string, now: Date = new Date()): Promise<ChildResponseDto> {
    const child = await this.repository.findById(id);
    if (!child) {
      throw new NotFoundException(CHILD_NOT_FOUND);
    }
    return ChildMapper.toResponseDto(child, toIsoDate(now));
  }

  async create(
    dto: SaveChildDto,
    now: Date = new Date(),
  ): Promise<ChildResponseDto> {
    const child = await this.repository.create(ChildMapper.toInput(dto));
    return ChildMapper.toResponseDto(child, toIsoDate(now));
  }

  async update(
    id: string,
    dto: SaveChildDto,
    now: Date = new Date(),
  ): Promise<ChildResponseDto> {
    const child = await this.repository.update(id, ChildMapper.toInput(dto));
    if (!child) {
      throw new NotFoundException(CHILD_NOT_FOUND);
    }
    return ChildMapper.toResponseDto(child, toIsoDate(now));
  }
}
