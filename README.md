# iep-cache

A node loader friendly asynchronous cache that supports tailored persistance through configuration.

The design allows for alternative cache persistance. The default `local-cache` implementation can be swapped out for `redis-cache`, `memcached-cache` or a custom persistance scheme. The `redis-cache`, `memcached-cache` implementations (to be) provided by this repo are compatible with horizontal scaling strategies such as [elastic-search](https://aws.amazon.com/elasticache/).

## Intentionality

The primary usage of this package is to support IEP loader caching requirements across process and network boundaries, but it can be used as a general purpose cache in architectures with similar cross boundary requirements.

## Usage and API

```javascript
import cache, { IEP_DATA } from 'iep-cache';

const entity = 'my-entity-key';

// cache strategy options (showing defaults)
const opts = {
  persistance: 'entity', // 'key' || false
  persistUrl: `file:///${process.env.PWD}/iep-cache/my-entity.json`, // valid URL
  cacheModule: './local-cache', // valid import specifier
  lazyLoad: false, // set to true for esm loader usage
  entityKey: 'data',
  defaults: {},
};

const myCache = cache(entity, opts);

// set up independent cache strategies for entities e1, e2, e3 and e4...

// default options
const cache1 = cache('e1');

// no persistance and default entities
const cache2 = cache('e2', {
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
  cache1.set('id1', { some: { data: 123 } });
  await cache1.get('id1'); // { some: { data: 123 }, timestamp: 1595587282003 }
  await cache1.getAll(); // {id1: { some: { data: 123 }, timestamp: 1595587282003 }}
  cache1.remove('id1');

  const cache2 = cache('my-entity');
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
- lazyLoad - load on first entity access request
- defaults - ,
