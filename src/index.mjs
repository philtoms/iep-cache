import path from 'path';

const defaultPersistUrl = path.resolve(process.env.PWD, 'iep-cache');

const args = (process.argv || []).reduce((acc, arg) => {
  const [name, value] = arg.split('=');
  return { ...acc, [name]: value };
}, {});

const strip = (opts) =>
  Object.entries(opts)
    .filter(
      ([key]) =>
        !key.startsWith('--') && !['lazyLoad', 'cacheModule'].includes(key)
    )
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

// promote true / false strings to Boolean
const boolFixup = (value) =>
  ['true', 'false'].includes(value) ? JSON.parse(value) : value;

// and the reverse for boolean for the above!
const bool = (value) =>
  [true, false].includes(value) ? value.toString() : value;

export default (entity, opts = {}) => {
  // params can come from entity bound, then default, argv and opts - in that order
  const cacheModule = boolFixup(
    args[`--${entity}-cache-module`] ||
      opts.cacheModule ||
      opts[`--${entity}-cache-module`] ||
      args['--cache-module'] ||
      opts[`--cache-module`] ||
      './local-cache'
  );

  const persistUrl = boolFixup(
    args[`--${entity}-persist-url`] ||
      bool(opts.persistUrl) ||
      bool(opts[`--${entity}-persist-url`]) ||
      args['--cache-persist-url'] ||
      opts['--cache-persist-url'] ||
      defaultPersistUrl
  );

  const persistance = boolFixup(
    args[`--${entity}-persistance`] ||
      bool(opts.persistance) ||
      bool(opts[`--${entity}-persistance`]) ||
      args['--cache-persistance'] ||
      opts['--cache-persistance'] ||
      'entity'
  );

  const entityKey = boolFixup(
    args[`--${entity}-key`] ||
      opts.entityKey ||
      opts[`--${entity}-entity-key`] ||
      args['--cache-entity-key'] ||
      opts['--cache-entity-key'] ||
      'value'
  );

  const lazyLoad = boolFixup(
    args[`--${entity}-lazy-load`] ||
      opts.lazyLoad ||
      opts[`--${entity}-lazy-load`] ||
      args['--cache-lazy-load'] ||
      opts['--cache-lazy-load'] ||
      'false'
  );

  let loaded;
  const cache = () =>
    loaded ||
    (loaded = import(cacheModule).then((module) => {
      const cache = module.default || module;
      return cache(entity, {
        ...opts,
        persistUrl,
        persistance,
        entityKey,
      });
    }));

  opts = strip(opts);
  if (!lazyLoad) cache();

  // lazy load the cache after the pre-loader cycle has completed.
  // - otherwise the import will force create a bogus singleton.
  return {
    get: async (...args) => (await cache()).get(...args),
    getEntry: async (...args) => (await cache()).getEntry(...args),
    getAll: async (...args) => (await cache()).getAll(...args),
    set: async (...args) => (await cache()).set(...args),
    remove: async (...args) => (await cache()).remove(...args),
  };
};
