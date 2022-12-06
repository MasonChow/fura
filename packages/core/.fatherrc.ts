import { defineConfig } from 'father';

export default defineConfig({
  esm: {
    transformer: 'swc',
  },
  cjs: {
    transformer: 'swc',
  },
  platform: 'node',
});
