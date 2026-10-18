import { Injectable } from '@nestjs/common';
import { Nursery } from '../models/nursery.model.js';
import { NurseryRepository } from './nursery.repository.js';

/**
 * Temporary in-memory data source, to be replaced by a database-backed
 * implementation without touching the service layer.
 */
@Injectable()
export class InMemoryNurseryRepository implements NurseryRepository {
  private readonly nursery: Nursery = {
    id: '1',
    name: 'Crèche Les Petits Pas',
    address: '12 rue des Lilas, 75000 Paris',
    capacity: 40,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  findCurrent(): Promise<Nursery> {
    return Promise.resolve(this.nursery);
  }
}
