import esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location?.file}:${location?.line}:${location?.column}:`);
      });
      console.log('[watch] build finished');
    });
  },
};

async function main() {
  // Build for Node.js (desktop)
  const nodeCtx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.cjs',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [esbuildProblemMatcherPlugin],
  });

  // Build for Web (browser)
  const webCtx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'browser',
    outfile: 'dist/extension.web.cjs',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [esbuildProblemMatcherPlugin],
  });

  if (watch) {
    await Promise.all([nodeCtx.watch(), webCtx.watch()]);
  } else {
    await Promise.all([nodeCtx.rebuild(), webCtx.rebuild()]);
    await Promise.all([nodeCtx.dispose(), webCtx.dispose()]);
  }
}

main().catch((/** @type {unknown} */ e) => {
  console.error(e);
  process.exit(1);
});
