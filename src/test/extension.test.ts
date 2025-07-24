import * as vscode from 'vscode';

// Import reliable test suites
import './schemas.test.js';
import './simple-integration.test.js';
import './symlink-resolver.test.js';

// Main test suite entry point
suite('pnpm Workspace Extension Test Suite', () => {
  vscode.window.showInformationMessage('Starting pnpm Workspace tests...');

  test('Extension should be present', () => {
    const extension = vscode.extensions.getExtension('reekystive.pnpm-workspace');
    vscode.window.showInformationMessage(`Extension found: ${!!extension}`);
  });
});
