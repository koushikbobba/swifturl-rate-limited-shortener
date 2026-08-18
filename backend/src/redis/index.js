// Simple in-memory cache to replace Redis
const cacheMap = new Map();

function set(key, value) {
  cacheMap.set(key, value);
}

function get(key) {
  return cacheMap.get(key);
}

module.exports = {
  set,
  get
};
