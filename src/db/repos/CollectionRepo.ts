import { db } from '../database';
import type { Collection } from '../../types/collection';

export class CollectionRepo {
  async getById(id: string): Promise<Collection | undefined> {
    return db.collections.get(id);
  }

  async getByName(name: string): Promise<Collection | undefined> {
    const rawTrimmed = name.trim();
    if (!rawTrimmed) return undefined;
    const trimmed = rawTrimmed.toLowerCase();

    // 1. Direct index match on trimmed lowercase
    const exactLower = await db.collections.where('name').equals(trimmed).first();
    if (exactLower) return exactLower;

    // 2. Direct index match on raw trimmed name if different
    if (rawTrimmed !== trimmed) {
      const exactRaw = await db.collections.where('name').equals(rawTrimmed).first();
      if (exactRaw) return exactRaw;
    }

    // 3. Case-insensitive index query via Dexie
    return db.collections.where('name').equalsIgnoreCase(rawTrimmed).first();
  }

  async getAll(): Promise<Collection[]> {
    return db.collections.orderBy('createdAt').reverse().toArray();
  }

  async add(collection: Collection): Promise<string> {
    return db.collections.add(collection);
  }

  async update(id: string, patch: Partial<Collection>): Promise<number> {
    return db.collections.update(id, patch);
  }

  async delete(id: string): Promise<void> {
    return db.collections.delete(id);
  }
}

export const collectionRepo = new CollectionRepo();

