import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ChildResponseDto } from '../dtos/child-response.dto.js';
import { ChildListResponseDto } from '../dtos/child-summary.dto.js';
import { SaveChildDto } from '../dtos/save-child.dto.js';
import { ChildrenService } from '../services/children.service.js';

@Controller('children')
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Get()
  list(): Promise<ChildListResponseDto> {
    return this.childrenService.list();
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<ChildResponseDto> {
    return this.childrenService.getById(id);
  }

  @Post()
  create(@Body() dto: SaveChildDto): Promise<ChildResponseDto> {
    return this.childrenService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveChildDto,
  ): Promise<ChildResponseDto> {
    return this.childrenService.update(id, dto);
  }
}
