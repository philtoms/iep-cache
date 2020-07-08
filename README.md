# iep-cache

A node loader friendly asynchronous cache that supports tailored persistance through configuration.

The primary usage of this package is to support IEP loader caching requirements across process and network boundaries, but it can be used as a general purpose cache in architectures with similar cross boundary requirements.

The design has a publish-subscribe architecture and supports dynamically loaded cache persistance. The default `local-cache` implementation can be swapped out for `redis-cache`, `memcached-cache` or a custom persistance scheme. The `redis-cache`, `memcached-cache` implementations provided by this repo are compatible with horizontal scaling strategies such as [elastic-search](https://aws.amazon.com/elasticache/).

## API

- get
- getAll
- set
- remove
- publish
- subscribe

## Cache persistance

### local-cache

`local-cache` is the default cache persistance strategy. It is a local file system backed memory cache with a pubsub configured to support the current `iep` loader's child_process architecture. It is intended for development and live configurations that do not require horizontal scaling.

## iep-cache configuration

`iep-cache` accepts the following configuration key values in various formats

`process.env.CACHE_PERSIST_URL` or argv `--cache-persist-url` a URL resolved persistence endpoint (default: `file:///cached/`)
`process.env.{entity}_PERSISTANCE` or argv `--{entity}-persistancey` one of `entity` or `key`.
`process.env.CACHE_MODULE` or argv `--cache-module` an import specifier for dynamically loaded cache persistance.
`process.env.CACHE_LAZY_LOAD` or argv `--cache-lazy-load` delay loading until first API request.
