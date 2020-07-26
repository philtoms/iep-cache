import test from 'ava';
import cache from '../local-cache/index.mjs';

import '../local-cache/timestamp.mjs?__fake=mock(1)';
import 'path?__fake=./mocks/path.mjs';
import fs from 'fs?__fake=./mocks/fs.mjs';
import pubsub, { registered } from 'iep-pubsub?__fake=./mocks/iep-pubsub.mjs';

test('set -> get an entity value', (t) => {
  cache('entity').set('id1', 123);
  t.is(cache('entity').get('id1'), 123);
});

test('get an entity entry', (t) => {
  cache('entity').set('id1', { here: 123 });
  t.deepEqual(cache('entity').getEntry('id1'), {
    id: 'id1',
    value: { here: 123 },
    timestamp: 1,
  });
});

test('get an entity entry with custom entity key', (t) => {
  const sourceCache = cache('entity', { entityKey: 'source' });
  sourceCache.set('id1', 'source...');
  t.deepEqual(sourceCache.getEntry('id1'), {
    id: 'id1',
    source: 'source...',
    timestamp: 1,
  });
});

test('get an entity value with custom entity key', (t) => {
  const sourceCache = cache('entity', { entityKey: 'source' });
  sourceCache.set('id1', 'source...');
  t.is(sourceCache.get('id1'), 'source...');
});

test('get value not found', (t) => {
  t.is(cache('entity').get('id1-nf'), undefined);
});

test('get entry not found', (t) => {
  t.deepEqual(cache('entity').getEntry('id1-nf'), {
    id: 'id1-nf',
    value: undefined,
    timestamp: 0,
  });
});

test('get all entries', (t) => {
  cache('entity').set('id1', 123);
  t.deepEqual(cache('entity').getAll('id1'), [
    {
      id: 'id1',
      value: 123,
      timestamp: 1,
    },
  ]);
});

test('update an entity value', (t) => {
  cache('entity').set('id1', 123);
  cache('entity').set('id1', 456);
  t.is(cache('entity').get('id1'), 456);
});

test('remove entry', (t) => {
  cache('entity').set('id1', 123);
  cache('entity').remove('id1');
  t.is(cache('entity').get('id1'), undefined);
});

test('persist an entity set using default config', (t) => {
  fs.writeFile.reset();
  cache('entity').set('id1', 123);
  t.is(fs.writeFile.values[0][0], '/iep-cache/entity.json');
  t.is(
    fs.writeFile.values[0][1],
    JSON.stringify({ id1: cache('entity').getEntry('id1') })
  );
});

test('persist an entity set to custom folder/.json', (t) => {
  fs.writeFile.reset();
  cache('entity', { persistUrl: './here' }).set('id1', 123);
  t.is(fs.writeFile.values[0][0], './here/entity.json');
});

test('configure to not persist', (t) => {
  fs.writeFile.reset();
  cache('entity', { persistance: false }).set('id1', 123);
  t.is(fs.writeFile.calls, 0);
});

test('persist an entity entry to filepath/id', (t) => {
  fs.writeFile.reset();
  cache('entity', { persistUrl: './here', persistance: 'key' }).set('id1', 123);
  t.is(fs.writeFile.values[0][0], './here/id1');
  t.is(fs.writeFile.values[0][1], 123);
});

test('load an entity set', (t) => {
  const entry = { id: 'id1', value: 123, timestamp: 5 };
  fs.readFileSync.reset(JSON.stringify({ id1: entry }));
  t.deepEqual(cache('loaded-entity').getEntry('id1'), entry);
});

test('load an entity entry with file stat timestamp', (t) => {
  fs.readFileSync.reset(123);
  t.deepEqual(cache('entity', { persistance: 'key' }).getEntry('id2'), {
    id: 'id2',
    value: 123,
    timestamp: 1,
  });
});

test('purge an entity set', (t) => {
  const entry = { id: 'id1', value: 123, timestamp: 5 };
  fs.readFileSync.reset(JSON.stringify({ id1: entry }));
  t.deepEqual(cache('entity', { purge: true }).getEntry('id1'), entry);
});

test('load an new entity set using default config', (t) => {
  fs.readFileSync.reset(null);
  t.is(cache('new-entity1').get('key'), undefined);
});

test('load an new entity set using default values', (t) => {
  fs.readFileSync.reset(null);
  t.is(cache('new-entity2', { defaults: { id1: 456 } }).get('id1'), 456);
});

test('publish an new entity entry', (t) => {
  const { publish } = pubsub();
  publish.reset();
  cache('entity').set('id1', 123);
  t.deepEqual(publish.values[0], ['entity', { set: ['id1', 123, false] }]);
});

test('subscribe to an new entity entry', (t) => {
  const { subscribe } = pubsub();
  cache('entity');
  t.is(subscribe.values[0][0], 'entity');
});

test('update subscription', (t) => {
  cache('entity');
  registered({ set: ['id1', 456, false] });
  t.is(cache('entity').get('id1'), 456);
});
