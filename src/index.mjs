// don't export a symbol
export const IEP_STR = 'iep-cache-str';

const args = (process.argv || []).reduce((acc, arg) => {
  const [name, value] = arg.split('=');
  return { ...acc, [name]: value };
}, {});

// promote true / false strings to Boolean
const boolFixup = (value) =>
  ['true', 'false'].includes(value) ? JSON.parse(value) : value;

export default (entity, opts = {}) => {
  // params can come from env, opts, args or defaults - in that order
  const cacheModule = boolFixup(
    process.env.CACHE_MODULE ||
      opts['cache-module'] ||
      args['--cache-module'] ||
      './local-cache'
  );

  const persistUrl = boolFixup(
    process.env.CACHE_PERSIST_URL ||
      opts['cache-persist-url'] ||
      args['--cache-persist-url'] ||
      ''
  );

  const entityPersistance = boolFixup(
    process.env[`${entity}_PERSISTANCE`] ||
      opts[`${entity}-persistance`] ||
      args[`--${entity}-persistance`] ||
      'false'
  );

  const lazyLoad = boolFixup(args[`--cache-lazy-load`] || 'false');

  let loaded;
  const cache = () =>
    loaded ||
    (loaded = import(cacheModule).then((module) => {
      const cache = module.default || module;
      return cache(entity, {
        ...opts,
        IEP_STR,
        persistUrl,
        entityPersistance,
      });
    }));

  if (!lazyLoad) cache();

  // lazy load the cache after the pre-loader cycle has completed.
  // - otherwise the import will force create a bogus singleton.
  return {
    get: async (...args) => (await cache()).get(...args),
    getAll: async (...args) => (await cache()).getAll(...args),
    set: async (...args) => (await cache()).set(...args),
    remove: async (...args) => (await cache()).remove(...args),
    update: async (...args) => (await cache()).update(...args),
  };
};
