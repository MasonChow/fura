import { defineConfig } from 'father';

export default defineConfig({
  esm: {
    transformer: 'swc',
  },
  platform: 'node',
});
