
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react'; // Import useCallback
import { db } from '@/lib/db';
import type { CardSet, Tag } from '@/types';

export function useIndexedDB() {
  // Live Queries for real-time updates in components
  const allCardSets = useLiveQuery(() => db.cardSets.toArray(), []);
  const allTags = useLiveQuery(() => db.tags.toArray(), []);
  const availableThemes = useLiveQuery(async () => {
     const themes = await db.cardSets.orderBy('theme').uniqueKeys();
     return (themes as (string | undefined | null)[])
            .filter((theme): theme is string => typeof theme === 'string' && theme !== '');
  }, []);

   const availableTags = useLiveQuery(async () => {
      const uniqueTagArrays = await db.cardSets.orderBy('tags').uniqueKeys();
      const allTagsFlat = (uniqueTagArrays as string[][]).flat();
      // Filter out empty strings and null/undefined before creating Set for uniqueness
      const validTags = allTagsFlat.filter(tag => typeof tag === 'string' && tag.trim() !== '');
      return Array.from(new Set(validTags));
   }, []);


  // CRUD Operations (async functions, not hooks directly, but used by components/stores)
  const addCardSet = useCallback(async (cardSet: CardSet): Promise<string> => {
    const now = new Date();
    cardSet.createdAt = cardSet.createdAt || now;
    cardSet.updatedAt = now;
    for (const tagName of cardSet.tags) {
        const existingTag = await db.tags.where('name').equals(tagName).first();
        if (!existingTag) {
            await db.tags.add({ id: crypto.randomUUID(), name: tagName });
        }
    }
    return db.cardSets.add(cardSet);
  }, []);

  const getCardSetById = useCallback(async (id: string): Promise<CardSet | undefined> => {
    return db.cardSets.get(id);
  }, []);

  const updateCardSet = useCallback(async (id: string, changes: Partial<CardSet>): Promise<number> => {
     if (changes.tags) {
         for (const tagName of changes.tags) {
             const existingTag = await db.tags.where('name').equals(tagName).first();
             if (!existingTag) {
                 await db.tags.add({ id: crypto.randomUUID(), name: tagName });
             }
         }
     }
    return db.cardSets.update(id, { ...changes, updatedAt: new Date() });
  }, []);

  const deleteCardSet = useCallback(async (id: string): Promise<void> => {
    return db.cardSets.delete(id);
  }, []);

  const addTag = useCallback(async (tag: Omit<Tag, 'id'>): Promise<string> => {
    const existingTag = await db.tags.where('name').equals(tag.name).first();
    if (existingTag) {
      return existingTag.id;
    }
    const newId = crypto.randomUUID();
    return db.tags.add({ ...tag, id: newId });
  }, []);

 const getCardSets = useCallback(async (filter?: { theme?: string | null; tags?: string[] }): Promise<CardSet[]> => {
    if (!filter || (!filter.theme && (!filter.tags || filter.tags.length === 0))) {
      return db.cardSets.toArray();
    }

    let collection = db.cardSets.toCollection();

    if (filter.theme) {
      collection = collection.filter(set => set.theme === filter.theme);
    }

    if (filter.tags && filter.tags.length > 0) {
      const tagSet = new Set(filter.tags);
      collection = collection.filter(set => set.tags.some(tag => tagSet.has(tag)));
    }

    return collection.toArray();
  }, []);


  return {
    allCardSets: allCardSets ?? [],
    allTags: allTags ?? [],
    availableThemes: availableThemes ?? [],
    availableTags: availableTags ?? [],
    addCardSet,
    getCardSetById,
    updateCardSet,
    deleteCardSet,
    addTag,
    getCardSets,
  };
}

    