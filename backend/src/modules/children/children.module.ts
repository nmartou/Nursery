import { Module } from '@nestjs/common';
import { ChildrenController } from './controllers/children.controller.js';
import { ChildRepository } from './repositories/child.repository.js';
import { ChildrenService } from './services/children.service.js';

@Module({
  controllers: [ChildrenController],
  providers: [ChildrenService, ChildRepository],
})
export class ChildrenModule {}
