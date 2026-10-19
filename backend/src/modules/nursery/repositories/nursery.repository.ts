import type { Nursery } from '../models/nursery.model.js';

export interface NurseryRepository {
  findCurrent(): Promise<Nursery>;
}
