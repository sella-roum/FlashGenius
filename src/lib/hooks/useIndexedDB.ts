'use client';

import { useLiveQuery } from 'dexie-react-hooks';
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
      const allTags = (uniqueTagArrays as string[][]).flat();
      return Array.from(new Set(allTags)).filter(tag => tag !== '');
   }, []);


  // CRUD Operations (async functions, not hooks directly, but used by components/stores)
  const addCardSet = async (cardSet: CardSet): Promise<string> => {
    // Ensure dates are set
    const now = new Date();
    cardSet.createdAt = cardSet.createdAt || now;
    cardSet.updatedAt = now;
    // Ensure unique tags are added to the tags table
    for (const tagName of cardSet.tags) {
        const existingTag = await db.tags.where('name').equals(tagName).first();
        if (!existingTag) {
            await db.tags.add({ id: crypto.randomUUID(), name: tagName });
        }
    }
    return db.cardSets.add(cardSet);
  };

  const getCardSetById = async (id: string): Promise<CardSet | undefined> => {
    return db.cardSets.get(id);
  };

  const updateCardSet = async (id: string, changes: Partial<CardSet>): Promise<number> => {
     // Ensure unique tags are added if tags are updated
     if (changes.tags) {
         for (const tagName of changes.tags) {
             const existingTag = await db.tags.where('name').equals(tagName).first();
             if (!existingTag) {
                 await db.tags.add({ id: crypto.randomUUID(), name: tagName });
             }
         }
     }
    return db.cardSets.update(id, { ...changes, updatedAt: new Date() });
  };

  const deleteCardSet = async (id: string): Promise<void> => {
    return db.cardSets.delete(id);
  };

  const addTag = async (tag: Omit<Tag, 'id'>): Promise<string> => {
    const existingTag = await db.tags.where('name').equals(tag.name).first();
    if (existingTag) {
      return existingTag.id;
    }
    const newId = crypto.randomUUID();
    return db.tags.add({ ...tag, id: newId });
  };

 const getCardSets = async (filter?: { theme?: string | null; tags?: string[] }): Promise<CardSet[]> => {
    if (!filter || (!filter.theme && (!filter.tags || filter.tags.length === 0))) {
      return db.cardSets.toArray();
    }

    let collection = db.cardSets.toCollection(); // Start with all sets

    if (filter.theme) {
      collection = collection.filter(set => set.theme === filter.theme);
    }

    if (filter.tags && filter.tags.length > 0) {
      // This requires iterating after potential theme filtering,
      // or a more complex query if Dexie supports it directly on the filtered collection.
      // Using filter for simplicity here.
      const tagSet = new Set(filter.tags);
      collection = collection.filter(set => set.tags.some(tag => tagSet.has(tag)));
    }

    return collection.toArray();
  };


  return {
    // Live Query Results
    allCardSets: allCardSets ?? [],
    allTags: allTags ?? [],
    availableThemes: availableThemes ?? [],
    availableTags: availableTags ?? [],

    // Async CRUD Functions
    addCardSet,
    getCardSetById,
    updateCardSet,
    deleteCardSet,
    addTag,
    getCardSets, // Expose the filtering function
  };
}
