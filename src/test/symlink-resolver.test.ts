import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { containsSymlinks, resolvePathFromWorkspaceRoot, resolveSymlinks } from '../symlink-resolver.js';

suite('Symlink Resolver Tests', () => {
  let testDir: string;

  setup(async () => {
    // Create a temporary directory for testing
    testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pnpm-workspace-test-'));
  });

  teardown(async () => {
    // Clean up test directory
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should resolve real file path without symlinks', async () => {
    // Create a regular file
    const realFile = path.join(testDir, 'real-file.txt');
    await fs.promises.writeFile(realFile, 'test content');

    const resolved = await resolveSymlinks(realFile);
    assert.strictEqual(resolved, realFile);
  });

  test('should resolve single symlink', async () => {
    // Create a real file and a symlink to it
    const realFile = path.join(testDir, 'real-file.txt');
    const symlinkFile = path.join(testDir, 'symlink-file.txt');

    await fs.promises.writeFile(realFile, 'test content');
    await fs.promises.symlink(realFile, symlinkFile);

    const resolved = await resolveSymlinks(symlinkFile);
    assert.strictEqual(resolved, realFile);
  });

  test('should resolve nested symlinks', async () => {
    // Create a chain of symlinks: link1 -> link2 -> realFile
    const realFile = path.join(testDir, 'real-file.txt');
    const link1 = path.join(testDir, 'link1.txt');
    const link2 = path.join(testDir, 'link2.txt');

    await fs.promises.writeFile(realFile, 'test content');
    await fs.promises.symlink(realFile, link2);
    await fs.promises.symlink(link2, link1);

    const resolved = await resolveSymlinks(link1);
    assert.strictEqual(resolved, realFile);
  });

  test('should detect symlink cycles and return null', async () => {
    // Create a cycle: link1 -> link2 -> link1
    const link1 = path.join(testDir, 'link1.txt');
    const link2 = path.join(testDir, 'link2.txt');

    await fs.promises.symlink(link2, link1);
    await fs.promises.symlink(link1, link2);

    const resolved = await resolveSymlinks(link1);
    assert.strictEqual(resolved, null);
  });

  test('should handle non-existent paths', async () => {
    const nonExistentPath = path.join(testDir, 'non-existent.txt');

    const resolved = await resolveSymlinks(nonExistentPath);
    assert.strictEqual(resolved, null);
  });

  test('should resolve relative symlinks', async () => {
    // Create a subdirectory and a file
    const subdir = path.join(testDir, 'subdir');
    await fs.promises.mkdir(subdir);

    const realFile = path.join(subdir, 'real-file.txt');
    await fs.promises.writeFile(realFile, 'test content');

    // Create a relative symlink from testDir to the file
    const symlinkFile = path.join(testDir, 'symlink-file.txt');
    await fs.promises.symlink(path.join('subdir', 'real-file.txt'), symlinkFile);

    const resolved = await resolveSymlinks(symlinkFile);
    assert.strictEqual(resolved, realFile);
  });

  test('should detect when path contains symlinks', async () => {
    // Create a directory structure with symlinks: workspace/node_modules -> ../real-modules/package
    const realModules = path.join(testDir, 'real-modules');
    const packageDir = path.join(realModules, 'package');
    const nodeModules = path.join(testDir, 'node_modules');
    const packageFile = path.join(nodeModules, 'package', 'index.js');

    await fs.promises.mkdir(realModules, { recursive: true });
    await fs.promises.mkdir(packageDir, { recursive: true });
    await fs.promises.writeFile(path.join(packageDir, 'index.js'), 'module.exports = {};');

    // Create symlink: node_modules/package -> ../real-modules/package
    await fs.promises.mkdir(path.join(testDir, 'node_modules'), { recursive: true });
    await fs.promises.symlink(path.resolve(packageDir), path.resolve(nodeModules, 'package'));

    const hasSymlinks = await containsSymlinks(packageFile, testDir);
    assert.strictEqual(hasSymlinks, true);
  });

  test('should detect when path does not contain symlinks', async () => {
    // Create a regular directory structure
    const regularDir = path.join(testDir, 'regular');
    const regularFile = path.join(regularDir, 'file.txt');

    await fs.promises.mkdir(regularDir, { recursive: true });
    await fs.promises.writeFile(regularFile, 'test content');

    const hasSymlinks = await containsSymlinks(regularFile, testDir);
    assert.strictEqual(hasSymlinks, false);
  });

  test('should resolve path from workspace root with symlinks', async () => {
    // Create a complex structure: workspace/node_modules/pkg -> workspace/packages/pkg/file.js
    const packagesDir = path.join(testDir, 'packages', 'pkg');
    const nodeModulesDir = path.join(testDir, 'node_modules');
    const realFile = path.join(packagesDir, 'index.js');
    const symlinkPkg = path.join(nodeModulesDir, 'pkg');
    const accessedFile = path.join(symlinkPkg, 'index.js');

    // Create the real package
    await fs.promises.mkdir(packagesDir, { recursive: true });
    await fs.promises.writeFile(realFile, 'module.exports = {};');

    // Create node_modules and symlink
    await fs.promises.mkdir(nodeModulesDir, { recursive: true });
    await fs.promises.symlink(packagesDir, symlinkPkg);

    const resolved = await resolvePathFromWorkspaceRoot(accessedFile, testDir);
    assert.strictEqual(resolved, realFile);
  });

  test('should handle paths outside workspace root', async () => {
    const outsidePath = path.join(os.tmpdir(), 'outside-file.txt');
    await fs.promises.writeFile(outsidePath, 'test content');

    const resolved = await resolvePathFromWorkspaceRoot(outsidePath, testDir);
    assert.strictEqual(resolved, outsidePath); // Should return as-is

    // Clean up
    await fs.promises.unlink(outsidePath);
  });

  test('should import symlink resolver module without errors', async () => {
    const module = await import('../symlink-resolver.js');

    assert.ok(module.resolveSymlinks, 'resolveSymlinks function should be exported');
    assert.ok(module.resolvePathFromWorkspaceRoot, 'resolvePathFromWorkspaceRoot function should be exported');
    assert.ok(module.containsSymlinks, 'containsSymlinks function should be exported');
    assert.ok(module.revealOriginalInExplorer, 'revealOriginalInExplorer function should be exported');
  });
});
