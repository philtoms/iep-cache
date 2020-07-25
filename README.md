# iep-cache

A node loader friendly asynchronous cache that supports tailored persistance through configuration.

The design allows for alternative cache persistance. The default `local-cache` implementation can be swapped out for `redis-cache`, `memcached-cache` or a custom persistance scheme. The `redis-cache`, `memcached-cache` implementations (to be) provided by this repo are compatible with horizontal scaling strategies such as [elastic-search](https://aws.amazon.com/elasticache/).

## Intentionality

The primary usage of this package is to support IEP loader caching requirements across process and network boundaries, but it can be used as a general purpose cache in architectures with similar cross boundary requirements.

## Usage and API

```javascript
import cache, { IEP_DATA } from 'iep-cache';

// cache strategy options (showing defaults)
const opts = {
  persistance: 'set', // 'entity' || false
  persistUrl: `file:///${process.env.PWD}/iep-cache/my-entity.json`, // valid URL
  cacheModule: './local-cache', // valid import specifier
  lazyLoad: false, // set to true for esm loader usage
  entityKey: 'value',
  defaults: {},
  purge: false, // true
};

const myCache = cache('my-entity-set', opts);

// set up independent cache strategies for entity sets e1, e2, e3 and e4...

// default options
const cacheE1 = cache('e1');

// no persistance and default entities
const cacheE2 = cache('e2', {
  persistance: false,
  defaults: { my: { data: [] } },
});

// custom folder persistance
const cache3 = cache('e3', { persistUrl: 'file:///some/other/location' });

// redis persistance
const cache4 = cache('e4', {
  persistURL: 'https://redis/server',
  cacheModule: 'redis-cache',
});

(async () => {
  cacheE1.set('id1', { some: { data: 123 } });
  await cacheE1.get('id1'); // { some: { data: 123 }}
  await cacheE1.getEntity('id1'); // { value: {some: { data: 123 }}, timestamp: 1595587282003 }
  await cacheE1.getSet(); // [{id: id1, value: {some: { data: 123 }}, timestamp: 1595587282003 }]
  cacheE1.remove('id1');

  const cacheE2 = cache('my-entity');
})();
```

## Unified caching across architectural boundaries

Internally, `iep-cache` coordinates with [iep-pubsub](https://github.com/philtoms/iep-pubsub)
to handle cross boundary synchronization. But it will only do this if `iep-pubsub`
has already been loaded and established.

```javascript
import pubsub from 'iep-pubsub';
import cache from 'iep-cache';

pubsub();
```

## Alternative configuration strategies

`iep-cache` accepts configuration in priority order from `process.argv` and
API options on an entity first basis.

For a cache entity `e` - as in `cache('e', options)` - these config options....

| `process.argv`   | API `options`                     |
| ---------------- | --------------------------------- |
| --e-persistance  | persistance `||` --e-persistance  |
| --e-persist-url  | persistUrl `||` --e-persist-url   |
| --e-cache-module | cacheModule `||` --e-cache-module |
| --e-lazy-load    | lazyLoad `||` --e-lazyLoad        |
| --e-entity-key   | entityKey `||` --e-entity-key     |
|                  | defaults (default `{}`)           |
|                  | purge                             |

override these (configurable) defaults...

| `process.argv`      | `default`                                             |
| ------------------- | ----------------------------------------------------- |
| --cache-persistance | `entity`                                              |
| --cache-persist-url | `file:///${process.env.PWD}/iep-cache/my-entity.json` |
| --cache-module      | `./local-cache`                                       |
| --cache-lazy-load   | `false`                                               |
| --cache-entity-key  | 'data'                                                |

### The options explained

- persistance - either the entire entity or just a specific entity key value.
- entityKey - the entity key name under which the data will be located.
- persistUrl - the URL endpoint of the persistance handler.
- cacheModule - an import specifier resolving to the cache handler module.
- lazyLoad - load on first entity access request.
- defaults - a set of default entity values.
- purge - remove all entity entries from memory. Does not touch persisted entries.
