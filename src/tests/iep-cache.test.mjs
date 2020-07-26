import test from 'ava';

import mock from 'cache-module?__fake=mock({get: mock()})';

const sut = () =>
  import('../index.mjs?__fake=reload').then((module) => module.default);

test.serial.beforeEach(() => {
  mock.reset();
});

test.serial('lazy load cache module', async (t) => {
  const cache = await sut();

  const testCache = await cache('test', {
    cacheModule: 'cache-module',
    lazyLoad: true,
  });

  await new Promise((resolve) =>
    setTimeout(() => resolve(t.is(mock.calls, 0)))
  );

  await testCache.get();
  t.is(mock.calls, 1);
});

test.serial('immediately load cache module', async (t) => {
  const cache = await sut();

  cache('test', { cacheModule: 'cache-module', lazyLoad: false });

  await new Promise((resolve) =>
    setTimeout(() => resolve(t.is(mock.calls, 1)))
  );
});

test.serial('alternate option syntax', async (t) => {
  const cache = await sut();

  cache('test', {
    '--cache-module': 'cache-module',
  });

  await new Promise((resolve) =>
    setTimeout(() => resolve(t.is(mock.calls, 1)))
  );
});

test.serial('pass entity key through to cache module', async (t) => {
  const cache = await sut();

  await cache('test', {
    cacheModule: 'cache-module',
    persistUrl: false,
  }).get();

  t.is(mock.values[0][0], 'test');
});

test.serial('pass opts through to cache module', async (t) => {
  const cache = await sut();

  await cache('test', {
    cacheModule: 'cache-module',
    extra: 123,
    persistUrl: false,
  }).get();

  t.deepEqual(mock.values[0][1], {
    entityKey: 'value',
    extra: 123,
    persistUrl: false,
    persistance: 'entity',
  });
});

test.serial('pass argv through to cache module', async (t) => {
  process.argv = ['--cache-module=cache-module', '--cache-persist-url=false'];
  const cache = await sut();

  await cache('test').get();

  t.deepEqual(mock.values[0][1], {
    entityKey: 'value',
    persistUrl: false,
    persistance: 'entity',
  });
});

test.serial('merge argv and opts', async (t) => {
  process.argv = ['--cache-module=cache-module', '--cache-persist-url=false'];
  const cache = await sut();

  await cache('test', { extra: 123 }).get();

  t.deepEqual(mock.values[0][1], {
    entityKey: 'value',
    extra: 123,
    persistUrl: false,
    persistance: 'entity',
  });
});

test.serial('entity opts precedence over defaults', async (t) => {
  const cache = await sut();

  await cache('test', {
    cacheModule: 'cache-module',
    '--persist-url': 'here',
    '--test-persist-url': 'there',
  }).get();

  t.is(mock.values[0][1].persistUrl, 'there');
});

test.serial('argv precedence over opts', async (t) => {
  process.argv = ['--cache-module=cache-module', '--cache-persist-url=there'];
  const cache = await sut();

  await cache('test', { '--cache-persist-url': 'here' }).get();

  t.is(mock.values[0][1].persistUrl, 'there');
});
