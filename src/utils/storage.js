// Storage adapter - works in both artifact (window.storage) and standalone (localStorage)
export const storage = {
  get: async (key) => {
    if (window.storage && window.storage.get) {
      return await window.storage.get(key);
    } else {
      const value = localStorage.getItem(key);
      return value ? { key, value } : null;
    }
  },
  set: async (key, value) => {
    if (window.storage && window.storage.set) {
      return await window.storage.set(key, value);
    } else {
      localStorage.setItem(key, value);
      return { key, value };
    }
  },
  delete: async (key) => {
    if (window.storage && window.storage.delete) {
      return await window.storage.delete(key);
    } else {
      localStorage.removeItem(key);
      return { key, deleted: true };
    }
  }
};
