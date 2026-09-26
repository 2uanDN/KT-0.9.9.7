import { db } from '../db/database';
import type { Item } from '../types/item';
import { removeVietnameseAccents } from '../utils/vietnamese';

export interface WikiLinkMatch {
  raw: string;
  target: string;
  alias?: string;
}

export const extractWikiLinks = (markdown: string): WikiLinkMatch[] => {
  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const matches: WikiLinkMatch[] = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    matches.push({
      raw: match[0],
      target: match[1].trim(),
      alias: match[2]?.trim(),
    });
  }
  return matches;
};

export const resolveWikiLink = async (target: string): Promise<Item | null> => {
  if (!target || typeof target !== 'string') return null;
  const cleanTarget = target.trim();
  if (!cleanTarget) return null;

  // First attempt: Direct ID lookup
  try {
    const byId = await db.items.get(cleanTarget);
    if (byId) return byId;
  } catch {
    // Non-standard key format, continue to title lookups
  }

  // Second attempt: Indexed title lookup (case-insensitive)
  try {
    const byExactTitle = await db.items
      .where('title')
      .equalsIgnoreCase(cleanTarget)
      .first();
    if (byExactTitle) return byExactTitle;
  } catch {
    // If indexed query fails, proceed to fallbacks
  }

  // Third attempt: Clean target without section anchor if present (e.g. [[Title#Section]])
  const baseTarget = cleanTarget.includes('#')
    ? cleanTarget.split('#')[0].trim()
    : cleanTarget;

  if (baseTarget && baseTarget !== cleanTarget) {
    try {
      const byBaseTitle = await db.items
        .where('title')
        .equalsIgnoreCase(baseTarget)
        .first();
      if (byBaseTitle) return byBaseTitle;
    } catch {
      // Proceed
    }
  }

  // Fourth attempt: Streaming Dexie scan with accent-folding and whitespace trimming
  try {
    const lowerClean = cleanTarget.toLowerCase();
    const lowerBase = baseTarget.toLowerCase();
    const normClean = removeVietnameseAccents(lowerClean);
    const normBase = removeVietnameseAccents(lowerBase);

    const match = await db.items
      .filter((item) => {
        const itemTitle = (item.title || '').trim().toLowerCase();
        if (itemTitle === lowerClean || (baseTarget !== cleanTarget && itemTitle === lowerBase)) {
          return true;
        }
        const normItemTitle = removeVietnameseAccents(itemTitle);
        return normItemTitle === normClean || (baseTarget !== cleanTarget && normItemTitle === normBase);
      })
      .first();

    return match || null;
  } catch (err) {
    console.error('Error in resolveWikiLink:', err);
    return null;
  }
};
