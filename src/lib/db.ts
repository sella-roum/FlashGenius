import Dexie, { type Table } from 'dexie';
import type { CardSet, Tag, Flashcard } from '@/types'; // Ensure Flashcard is exported if needed standalone, or adjust types

// Define the interfaces directly here if not importing,
// or ensure they are correctly imported from '@/types'

export class FlashGeniusDB extends Dexie {
  cardSets!: Table<CardSet, string>; // Primary key is string (id)
  tags!: Table<Tag, string>; // Primary key is string (id)

  constructor() {
    super('flashGeniusDB'); // Database name
    this.version(1).stores({
      // Schema definition
      cardSets: 'id, name, theme, *tags, createdAt, updatedAt', // Index primary key 'id' and other properties for querying
      tags: 'id, &name', // Index primary key 'id' and make 'name' unique and indexed
    });
  }
}

export const db = new FlashGeniusDB();

// Example Usage Functions (can be moved to useIndexedDB hook later)

export async function addCardSet(cardSet: CardSet): Promise<string> {
  return db.cardSets.add(cardSet);
}

export async function getCardSetById(id: string): Promise<CardSet | undefined> {
  return db.cardSets.get(id);
}

export async function getAllCardSets(): Promise<CardSet[]> {
  return db.cardSets.toArray();
}

export async function updateCardSet(id: string, changes: Partial<CardSet>): Promise<number> {
  return db.cardSets.update(id, { ...changes, updatedAt: new Date() });
}

export async function deleteCardSet(id: string): Promise<void> {
  return db.cardSets.delete(id);
}

export async function getAllTags(): Promise<Tag[]> {
  return db.tags.toArray();
}

export async function addTag(tag: Tag): Promise<string> {
    // Check if tag name already exists to maintain uniqueness defined by '&name'
    const existingTag = await db.tags.where('name').equals(tag.name).first();
    if (existingTag) {
        return existingTag.id; // Return existing tag id
    }
    return db.tags.add(tag);
}

// Add more functions as needed (e.g., filter by theme/tags)
export async function getCardSetsByTags(tagNames: string[]): Promise<CardSet[]> {
  if (!tagNames || tagNames.length === 0) {
    return getAllCardSets();
  }
  // Dexie's multi-valued index query
  return db.cardSets.where('tags').anyOf(tagNames).distinct().toArray();
}

export async function getCardSetsByTheme(theme: string): Promise<CardSet[]> {
    return db.cardSets.where('theme').equals(theme).toArray();
}

export async function getAvailableThemes(): Promise<string[]> {
    const themes = await db.cardSets.orderBy('theme').uniqueKeys();
    // Dexie returns keys which might be arrays or single values depending on index type
    // Filter out undefined/null and ensure strings
    return (themes as (string | undefined | null)[])
           .filter((theme): theme is string => typeof theme === 'string' && theme !== '');
}

export async function getAvailableTags(): Promise<string[]> {
    // Get all unique tag names directly from the cardSets table's tags index
    const uniqueTagArrays = await db.cardSets.orderBy('tags').uniqueKeys();
     // Flatten the array of arrays and remove duplicates
    const allTags = (uniqueTagArrays as string[][]).flat();
    return Array.from(new Set(allTags)).filter(tag => tag !== ''); // Filter out empty tags
}
