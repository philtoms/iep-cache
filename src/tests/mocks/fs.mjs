export const writeFile = mock();

export const readFileSync = mock('{}');

export const existsSync = mock(true);

export const statSync = mock(() => ({
  isFile: mock(true),
  mtime: {
    getTime: mock(1),
  },
}));

export default {
  writeFile,
  readFileSync,
  existsSync,
  statSync,
};
