import { createChunkedStorage } from '@/lib/secure-storage';

jest.mock('expo-secure-store', () => ({}));

function memoryStore() {
  const map = new Map<string, string>();
  return {
    map,
    getItemAsync: async (k: string) => map.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => void map.set(k, v),
    deleteItemAsync: async (k: string) => void map.delete(k),
  };
}

describe('createChunkedStorage', () => {
  it('uloží a načíta veľkú hodnotu po častiach', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store);
    const value = 'x'.repeat(5000);
    await storage.setItem('session', value);
    expect(store.map.get('session.chunks')).toBe('3');
    expect(await storage.getItem('session')).toBe(value);
  });

  it('prepísanie kratšou hodnotou zmaže staré časti', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store);
    await storage.setItem('session', 'y'.repeat(5000));
    await storage.setItem('session', 'short');
    expect(await storage.getItem('session')).toBe('short');
    expect(store.map.has('session.2')).toBe(false);
  });

  it('removeItem zmaže všetko', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store);
    await storage.setItem('session', 'z'.repeat(4000));
    await storage.removeItem('session');
    expect(store.map.size).toBe(0);
    expect(await storage.getItem('session')).toBeNull();
  });
});
