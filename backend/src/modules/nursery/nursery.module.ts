import { Module } from '@nestjs/common';
import { NURSERY_REPOSITORY } from '../../common/constants/injection-tokens.js';
import { NurseryController } from './controllers/nursery.controller.js';
import { InMemoryNurseryRepository } from './repositories/in-memory-nursery.repository.js';
import { NurseryService } from './services/nursery.service.js';

@Module({
  controllers: [NurseryController],
  providers: [
    NurseryService,
    { provide: NURSERY_REPOSITORY, useClass: InMemoryNurseryRepository },
  ],
})
export class NurseryModule {}
