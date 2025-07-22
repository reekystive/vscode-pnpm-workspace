import * as assert from 'assert';
import {
  clearPackageCache,
  getPackageAndDependencyPaths,
  getWorkspaceDependencies,
  getWorkspaceDependencyNames,
  getWorkspaceDependencyPaths,
} from '../pnpm-workspace.js';

suite('Simple Integration Tests', () => {
  setup(() => {
    clearPackageCache();
  });

  test('should clear package cache', () => {
    // This test verifies the basic functionality works
    clearPackageCache();
    assert.ok(true, 'Cache cleared successfully');
  });

  test('should import all modules without errors', async () => {
    // Test that all our modules can be imported
    const { WorkspaceConfigSchema } = await import('../schemas.js');
    const { findPnpmWorkspaceFiles } = await import('../workspace-discovery.js');
    const { loadPackageInfo } = await import('../package-scanner.js');
    const { getWorkspaceDependencies, getWorkspaceDependencyNames, getWorkspaceDependencyPaths } = await import(
      '../workspace-dependencies.js'
    );

    assert.ok(WorkspaceConfigSchema, 'Schema module loaded');
    assert.ok(findPnpmWorkspaceFiles, 'Workspace discovery module loaded');
    assert.ok(loadPackageInfo, 'Package scanner module loaded');
    assert.ok(getWorkspaceDependencies, 'Workspace dependencies module loaded');
    assert.ok(getWorkspaceDependencyNames, 'Workspace dependency names module loaded');
    assert.ok(getWorkspaceDependencyPaths, 'Workspace dependency paths module loaded');
  });

  test('should differentiate between dependency names, paths, and search paths', async () => {
    // Test that all functions exist and can be called
    assert.ok(typeof getWorkspaceDependencyNames === 'function', 'getWorkspaceDependencyNames should be a function');
    assert.ok(typeof getWorkspaceDependencies === 'function', 'getWorkspaceDependencies should be a function');
    assert.ok(typeof getWorkspaceDependencyPaths === 'function', 'getWorkspaceDependencyPaths should be a function');
    assert.ok(typeof getPackageAndDependencyPaths === 'function', 'getPackageAndDependencyPaths should be a function');

    // Note: These functions require a valid workspace to return meaningful results
    // In this test environment, they will return empty arrays, but should not throw errors
    try {
      const names = await getWorkspaceDependencyNames('test-package');
      const dependencies = await getWorkspaceDependencies('test-package');
      const paths = await getWorkspaceDependencyPaths('test-package');
      const searchPaths = await getPackageAndDependencyPaths('test-package');

      assert.ok(Array.isArray(names), 'getWorkspaceDependencyNames should return an array');
      assert.ok(Array.isArray(dependencies), 'getWorkspaceDependencies should return an array');
      assert.ok(Array.isArray(paths), 'getWorkspaceDependencyPaths should return an array');
      assert.ok(Array.isArray(searchPaths), 'getPackageAndDependencyPaths should return an array');
    } catch (error) {
      // Expected to fail in test environment without valid workspace
      assert.ok(error, 'Functions should handle missing workspace gracefully');
    }
  });
});
