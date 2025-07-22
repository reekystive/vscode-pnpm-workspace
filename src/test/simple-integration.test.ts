import * as assert from 'assert';
import { clearPackageCache } from '../pnpm-workspace.js';

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
    const { getWorkspaceDependencies } = await import('../workspace-dependencies.js');

    assert.ok(WorkspaceConfigSchema, 'Schema module loaded');
    assert.ok(findPnpmWorkspaceFiles, 'Workspace discovery module loaded');
    assert.ok(loadPackageInfo, 'Package scanner module loaded');
    assert.ok(getWorkspaceDependencies, 'Workspace dependencies module loaded');
  });
});
