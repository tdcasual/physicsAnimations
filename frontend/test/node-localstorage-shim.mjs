const memory = new Map();

const localStorageShim = {
  getItem(key) {
    const normalized = String(key);
    return memory.has(normalized) ? memory.get(normalized) : null;
  },
  setItem(key, value) {
    memory.set(String(key), String(value));
  },
  removeItem(key) {
    memory.delete(String(key));
  },
  clear() {
    memory.clear();
  },
  key(index) {
    const position = Number(index);
    if (!Number.isInteger(position) || position < 0 || position >= memory.size) {
      return null;
    }
    return Array.from(memory.keys())[position];
  },
  get length() {
    return memory.size;
  },
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  enumerable: true,
  writable: true,
  value: localStorageShim,
});

// Early mock for matchMedia (needed by GSAP before tests run)
Object.defineProperty(globalThis, "matchMedia", {
  configurable: true,
  enumerable: true,
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Early mock for ResizeObserver
Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  enumerable: true,
  writable: true,
  value: () => ({
    observe: () => {},
    unobserve: () => {},
    disconnect: () => {},
  }),
});
