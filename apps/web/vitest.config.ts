import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

function fromHere(path: string): string {
  return fileURLToPath(new URL(path, import.meta.url)).replace(/\/$/, '');
}

export default defineConfig({
  resolve: {
    alias: {
      '@components': fromHere('./components'),
      '@': fromHere('.'),
    },
  },
});
