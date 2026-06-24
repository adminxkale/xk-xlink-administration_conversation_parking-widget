import '@testing-library/jest-dom';

// Node.js 26+ introduces a built-in localStorage that is undefined without --localstorage-file.
// This shadows jsdom's localStorage in vitest. Provide a simple in-memory polyfill.
if (typeof globalThis.localStorage === 'undefined' || globalThis.localStorage === undefined) {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();
    get length() { return this.store.size; }
    clear() { this.store.clear(); }
    getItem(key: string) { return this.store.get(key) ?? null; }
    key(index: number) { return [...this.store.keys()][index] ?? null; }
    removeItem(key: string) { this.store.delete(key); }
    setItem(key: string, value: string) { this.store.set(key, String(value)); }
    [Symbol.iterator]() { return this.store.entries(); }
  }

  const ls = new MemoryStorage();
  const ss = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: ls, writable: true, configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: ss, writable: true, configurable: true });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: ls, writable: true, configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: ss, writable: true, configurable: true });
  }
}
