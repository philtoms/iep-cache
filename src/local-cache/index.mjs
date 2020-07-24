import fs from 'fs';
import path from 'path';
import pubsub from 'iep-pubsub';

// isolate private cache
const __CACHE = Symbol('iep-cache');

globalThis[__CACHE] = globalThis[__CACHE] || {};
const cache = globalThis[__CACHE];

export default (
  entity,
  { defaults = {}, persistUrl, entityPersistance, entityKey } = {}
) => {
  const { publish, subscribe } = pubsub();
  const filePath =
    persistUrl &&
    path.resolve(
      persistUrl,
      entityPersistance === 'key' ? '' : `${entity}.json`
    );

  cache[entity] = cache[entity] || {
    data: defaults,
  };

  try {
    const persistData = (persistKey) => {
      if (entityPersistance) {
        let data;
        let dataPath;

        if (persistKey) {
          data = cache[entity].data[persistKey][entityKey];
          dataPath = path.resolve(filePath, persistKey);
        } else {
          data = JSON.stringify(cache[entity].data);
          dataPath = filePath;
        }

        fs.writeFile(dataPath, data, (err) => {
          if (err) {
            throw err;
          }
        });
      }
    };

    const loadData = () => {
      if (
        !cache[entity].loaded &&
        fs.existsSync(filePath) &&
        fs.statSync(filePath).isFile()
      ) {
        const data = fs.readFileSync(filePath, 'utf8');
        if (data) {
          cache[entity].data =
            entityPersistance === 'key'
              ? // restore cache identity from file stats
                {
                  [entityKey]: data,
                  timestamp: fs.statSync(filePath).mtime.getTime(),
                }
              : JSON.parse(data);
          cache[entity].loaded = true;
        }
      }
    };

    const get = (key) => cache[entity].data[key] || {};

    const getAll = () => cache[entity] || {};

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
    err.message = `iep:local-cache - ${err.message}`;
    throw err;
  }
};
