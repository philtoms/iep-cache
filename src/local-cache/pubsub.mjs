export default (worker) => ({
  publish: (entity, message) => {
    worker.send({ entity, message });
  },

  subscribe: (target, subscriber) => {
    worker.on('message', ({ entity, message }) => {
      if (target === entity) subscriber(message);
    });
  },
});
