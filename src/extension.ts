import * as vscode from 'vscode';
import { registerCommands } from './commands.js';
import { initializeLogger, log } from './logger.js';

export function activate(context: vscode.ExtensionContext) {
  initializeLogger(context);

  log('Extension activation started');
  log(`Platform: ${typeof globalThis !== 'undefined' && 'window' in globalThis ? 'web' : 'desktop'}`);
  log('Extension "pnpm-workspace" is now active!');

  registerCommands(context);
}

// This method is called when your extension is deactivated
export function deactivate() {
  // do nothing
}
