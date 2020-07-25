import fs from 'fs';
import path from 'path';
import pubsub from 'iep-pubsub';
import timestamp from './timestamp.mjs';

const defaultPersistUrl = path.resolve(process.env.PWD, 'iep-cache');

// isolate private cache
const __CACHE = Symbol('iep-cache');

globalThis[__CACHE] = globalThis[__CACHE] || {};
const cache = globalThis[__CACHE];

export default (
  entity,
  {
    defaults = {},
    persistance = 'entity',
    persistUrl = defaultPersistUrl,
    entityKey = 'value',
    purge = false,
  } = {}
) => {
  const { publish, subscribe } = pubsub();
  const filePath =
    persistUrl &&
    path.resolve(persistUrl, persistance === 'key' ? '' : `${entity}.json`);

  cache[entity] = (!purge && cache[entity]) || {
    data: Object.entries(defaults).reduce(
      (acc, [id, value]) => ({ ...acc, [id]: { id, value, timestamp: 0 } }),
      {}
    ),
  };

  cache[entity].loaded = purge ? false : cache[entity].loaded;

  try {
    const persistData = (persistKey) => {
      if (persistance) {
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

    const loadData = (persistKey) => {
      const load = persistKey || !cache[entity].loaded;
      const dataPath = persistKey
        ? path.resolve(filePath, persistKey)
        : filePath;

      if (load && fs.existsSync(dataPath) && fs.statSync(dataPath).isFile()) {
        const data = fs.readFileSync(dataPath, 'utf8');
        if (data) {
          cache[entity].data =
            persistance === 'key'
              ? // restore cache identity from file stats
                {
                  ...cache[entity].data,
                  [persistKey]: {
                    id: persistKey,
                    [entityKey]: data,
                    timestamp: fs.statSync(dataPath).mtime.getTime(),
                  },
                }
              : JSON.parse(data);

          cache[entity].loaded = true;
        }
      }
    };

    const get = (id) => getEntry(id)[entityKey];

    const getEntry = (id) => {
      if (cache[entity].data[id]) {
        return cache[entity].data[id];
      }
      if (persistance === 'key') {
        loadData(id);
      }
      return (
        cache[entity].data[id] || {
          id,
          [entityKey]: undefined,
          timestamp: 0,
        }
      );
    };

    const getAll = () => Object.values(cache[entity].data);

    const set = (id, value, broadcast = true) => {
      cache[entity].data[id] = {
        id,
        [entityKey]: value,
        timestamp: timestamp(),
      };
      persistData(persistance === 'key' && id);
      if (broadcast) {
        publish(entity, { set: [id, value, false] });
      }
    };

    const remove = (id) => {
      Reflect.deleteProperty(cache[entity].data, id);
      persistData(persistance === 'key' && id);
    };

    subscribe(entity, (message) => {
      message.set && set(...message.set);
      message.remove && remove(...message.remove);
    });

    loadData();

    return {
      get,
      getEntry,
      getAll,
      set,
      remove,
    };
  } catch (err) {
    err.message = `iep:local-cache - ${err.message}`;
    throw err;
  }
};
