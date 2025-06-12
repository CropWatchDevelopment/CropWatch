import { describe, it, expect } from 'vitest';
import { BaseRepository } from '../../repositories/BaseRepository';
import { createMockSupabaseClient } from '../mocks/MockSupabase';
import { ErrorHandlingService } from '../../errors/ErrorHandlingService';

interface Item { id: number; name: string }
class TestRepo extends BaseRepository<Item, number> {
  protected tableName = 'items';
  protected primaryKey = 'id';
  protected entityName = 'Item';
}

describe('BaseRepository', () => {
  const mockData = { items: [{ id: 1, name: 'A' }] };
  const repo = new TestRepo(createMockSupabaseClient(mockData), new ErrorHandlingService());

  it('findById returns record', async () => {
    const result = await repo.findById(1);
    expect(result).toEqual({ id: 1, name: 'A' });
  });

  it('findAll returns all records', async () => {
    const result = await repo.findAll();
    expect(result).toHaveLength(1);
  });
});
