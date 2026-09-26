import Dexie, { type Table, type Transaction } from 'dexie';
import type { Item } from '../types/item';
import type { Tag } from '../types/tag';
import type { Collection } from '../types/collection';

export interface BinaryBlobEntry {
  id: string; // filename / opfsPath
  blob: Blob;
  mimeType: string;
  createdAt: number;
}

/**
 * ============================================================================
 * DATABASE SCHEMA & MIGRATION ARCHITECTURE GUIDELINES
 * ============================================================================
 * 
 * Dexie versioning rules for KhoTriThuc:
 * 
 * 1. IMMUTABLE VERSION DECLARATIONS:
 *    - Never delete or modify historical .version(N) declarations (e.g., version 1).
 *    - Dexie resolves upgrades incrementally: an existing database at version 1
 *      will sequentially execute version(2).upgrade(), version(3).upgrade(), etc.
 * 
 * 2. INDEXED VS NON-INDEXED ATTRIBUTES:
 *    - Indexed attributes (queried via where(), orderBy(), etc.):
 *      Must be declared in .version(N).stores({...}) for that version.
 *      Only tables whose indexes changed need to be specified in subsequent versions.
 *    - Non-indexed attributes (plain JS object properties):
 *      Do NOT require declaration in stores(). However, if existing rows need
 *      default values or data backfilling, an .upgrade(tx) callback is REQUIRED.
 * 
 * 3. UPGRADE HANDLER TRANSACTION SAFETY:
 *    - The `tx` parameter in `.upgrade(async (tx) => { ... })` is an IndexedDB
 *      `versionchange` transaction covering all tables defined in that version.
 *    - ALWAYS use `tx.table('tableName')` inside upgrade handlers instead of the
 *      outer `db` instance.
 *    - If an error is thrown within `upgrade()`, IndexedDB automatically aborts the
 *      transaction and rolls back the database to its pre-upgrade state.
 * 
 * 4. ADDING A NEW VERSION (e.g. Version 3):
 *    ```typescript
 *    this.version(3)
 *      .stores({
 *        items: '... updated index list ...',
 *        newTable: 'id, field, createdAt',
 *      })
 *      .upgrade(async (tx) => {
 *        // Transform data, backfill fields, or normalize schemas
 *      });
 *    ```
 * ============================================================================
 */

export class KhoTriThucDB extends Dexie {
  items!: Table<Item, string>;
  tags!: Table<Tag, string>;
  collections!: Table<Collection, string>;
  blobs!: Table<BinaryBlobEntry, string>; // Fallback/Cache store for OPFS binary files

  constructor() {
    super('KhoTriThuc');

    // -------------------------------------------------------------------------
    // VERSION 1: Baseline release schema
    // -------------------------------------------------------------------------
    this.version(1).stores({
      items: [
        'id',
        'type',
        'status',
        'isPinned',
        'savedAt',        // sort: Mới giữ
        'lastOpenedAt',   // sort: Mới mở
        'title',          // sort: Tiêu đề
        'createdAt',
        '*tags',          // multi-entry index
        '*collections',   // multi-entry index
      ].join(', '),
      tags: 'id, name, createdAt',
      collections: 'id, name, createdAt',
      blobs: 'id, mimeType, createdAt',
    });

    // -------------------------------------------------------------------------
    // VERSION 2: Schema Evolution
    // - Adds `updatedAt` index on `items` for sorting and synchronization
    // - Upgrades existing items: backfills `updatedAt` timestamp and guarantees
    //   data integrity for array fields (tags, collections, note embeds).
    // -------------------------------------------------------------------------
    this.version(2)
      .stores({
        items: [
          'id',
          'type',
          'status',
          'isPinned',
          'savedAt',        // sort: Mới giữ
          'lastOpenedAt',   // sort: Mới mở
          'title',          // sort: Tiêu đề
          'createdAt',
          'updatedAt',      // sort/sync: Mới cập nhật (added in v2)
          '*tags',          // multi-entry index
          '*collections',   // multi-entry index
        ].join(', '),
        // Note: 'tags', 'collections', and 'blobs' schemas are inherited from v1
      })
      .upgrade(async (tx: Transaction) => {
        // Backfill data and enforce invariants on all existing items
        await tx.table('items').toCollection().modify((item: any) => {
          // 1. Backfill updatedAt if missing or invalid
          if (typeof item.updatedAt !== 'number') {
            item.updatedAt = item.savedAt || item.createdAt || Date.now();
          }

          // 2. Guarantee tags array integrity
          if (!Array.isArray(item.tags)) {
            item.tags = [];
          } else if (item.tags.length > 0) {
            item.tags = Array.from(new Set(item.tags));
          }

          // 3. Guarantee collections array integrity
          if (!Array.isArray(item.collections)) {
            item.collections = [];
          } else if (item.collections.length > 0) {
            item.collections = Array.from(new Set(item.collections));
          }

          // 4. Guarantee embeds array for note items
          if (item.type === 'note' && !Array.isArray(item.embeds)) {
            item.embeds = [];
          }
        });
      });

    // -------------------------------------------------------------------------
    // VERSION 3: Compound Index Optimization
    // - Adds `[status+type]` compound index on `items` to eliminate in-memory
    //   filtering overhead in LibraryScreen and allow database-level queries.
    // -------------------------------------------------------------------------
    this.version(3)
      .stores({
        items: [
          'id',
          'type',
          'status',
          'isPinned',
          'savedAt',        // sort: Mới giữ
          'lastOpenedAt',   // sort: Mới mở
          'title',          // sort: Tiêu đề
          'createdAt',
          'updatedAt',      // sort/sync: Mới cập nhật
          '*tags',          // multi-entry index
          '*collections',   // multi-entry index
          '[status+type]',  // compound index (added in v3 for indexed status+type filtering)
        ].join(', '),
      })
      .upgrade(async (tx: Transaction) => {
        // Enforce valid status and type on existing items
        await tx.table('items').toCollection().modify((item: any) => {
          if (!item.status) {
            item.status = item.savedAt ? 'saved' : 'inbox';
          }
          if (!item.type) {
            item.type = 'note';
          }
        });
      });
  }
}

export const db = new KhoTriThucDB();
