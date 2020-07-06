import fs from 'fs';
import { resolve } from 'path';
import pubsub from './pubsub';

// isolate private cache
const __CACHE = Symbol('iep-cache');

globalThis[__CACHE] = globalThis[__CACHE] || {};
const cache = globalThis[__CACHE];

export default (
  entity,
  { defaults = {}, persistUrl, entityPersistance, IEP_STR } = {},
  log,
  worker
) => {
  const { publish, subscribe } = pubsub(worker);
  const path =
    persistUrl &&
    resolve(persistUrl, entityPersistance === 'key' ? '' : `${entity}.json`);

  cache[entity] = cache[entity] || {
    data: defaults,
  };

  try {
    const persistData = (persistKey) => {
      let data;
      let dataPath;

      if (persistKey) {
        data =
          IEP_STR in cache[entity].data[persistKey]
            ? cache[entity].data[persistKey][IEP_STR]
            : cache[entity].data[persistKey];
        dataPath = resolve(path, persistKey);
      } else if (persistUrl) {
        data = cache[entity].data;
        dataPath = path;
      }

      if (entityPersistance) {
        fs.writeFile(dataPath, JSON.stringify(data), (err) => {
          if (err) {
            throw err;
          }
        });
      }
    };

    const loadData = () => {
      if (!cache[entity].loaded && fs.existsSync(path)) {
        const data = fs.readFileSync(path, 'utf8');
        if (data) {
          cache[entity].data = JSON.parse(data);
          cache[entity].loaded = true;
        }
      }
    };

    const get = (key) => cache[entity].data[key] || false;

    const getAll = () => cache[entity];

    const set = (key, value, broadcast = true) => {
      cache[entity].data[key] = { ...value, timestamp: Date.now() };
      persistData(entityPersistance === 'key' && key);
      if (broadcast) {
        publish(entity, { set: [key, value, false] });
      }
    };

    const remove = (key) => {
      Reflect.deleteProperty(cache[entity], key);
      persistData(entityPersistance === 'key' && key);
    };

    subscribe(entity, (message) => {
      message.set && set(...message.set);
      message.remove && remove(...message.remove);
    });

    loadData();

    return {
      get,
      getAll,
      set,
      remove,
    };
  } catch (err) {
    log.error('iep:local-cache', err);
    throw new Error('500');
  }
};
