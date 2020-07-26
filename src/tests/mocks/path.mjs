export default {
  resolve: mock((root, path) =>
    `${root.replace(process.env.PWD, '')}/${path}`.replace(/\/$/, '')
  ),
};
