import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'dist-test/extension.test.cjs',
});
