import * as SecureStore from 'expo-secure-store';

/**
 * Úložisko session pre Supabase v Keychain/Keystore.
 * SecureStore nemusí spoľahlivo uložiť veľké hodnoty, preto hodnotu delíme na časti.
 */
const CHUNK_SIZE = 1800;

type KeyValueStore = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

export function createChunkedStorage(store: KeyValueStore = SecureStore) {
  async function removeItem(key: string): Promise<void> {
    const count = Number((await store.getItemAsync(countKey(key))) ?? 0);
    await Promise.all(
      Array.from({ length: count }, (_, i) => store.deleteItemAsync(chunkKey(key, i))),
    );
    await store.deleteItemAsync(countKey(key));
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const count = Number((await store.getItemAsync(countKey(key))) ?? 0);
      if (count === 0) return null;
      const chunks = await Promise.all(
        Array.from({ length: count }, (_, i) => store.getItemAsync(chunkKey(key, i))),
      );
      if (chunks.some((c) => c === null)) return null;
      return chunks.join('');
    },
    async setItem(key: string, value: string): Promise<void> {
      await removeItem(key);
      const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, 'g')) ?? [''];
      await Promise.all(chunks.map((chunk, i) => store.setItemAsync(chunkKey(key, i), chunk)));
      await store.setItemAsync(countKey(key), String(chunks.length));
    },
    removeItem,
  };
}
