export let registered;
export const publish = mock();
export const subscribe = mock(
  (channel, subscriber) => (registered = subscriber)
);
export default () => ({
  publish,
  subscribe,
});
