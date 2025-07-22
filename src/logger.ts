import * as vscode from 'vscode';

let outputChannel: vscode.LogOutputChannel | undefined;

export function initializeLogger(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('pnpm Workspace', { log: true });
  context.subscriptions.push(outputChannel);
}

export function log(message: string) {
  outputChannel?.info(message);
}

export function logError(message: string, error?: unknown) {
  if (error) {
    outputChannel?.error(
      error instanceof Error ? `${message}: ${error.message}` : `${message}: ${JSON.stringify(error)}`
    );
  } else {
    outputChannel?.error(message);
  }
}

export function logAndShowError(context: string, errorMessage: string) {
  logError(`${context}: ${errorMessage}`);
  vscode.window.showErrorMessage(errorMessage);
}
