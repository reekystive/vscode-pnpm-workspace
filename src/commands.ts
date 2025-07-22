import * as vscode from 'vscode';
import { log, logError } from './logger.js';
import {
  clearPackageCache,
  getWorkspaceDependencies,
  getWorkspacePackages,
  type WorkspacePackage,
} from './pnpm-workspace.js';

export function registerCommands(context: vscode.ExtensionContext) {
  // Copy Workspace Dependencies of...
  const copyWorkspaceDependencies = vscode.commands.registerCommand(
    'pnpm-workspace.copyWorkspaceDependenciesOf',
    async () => {
      log('=================================');
      log('Executing copyWorkspaceDependencies command');

      try {
        const packages = await getWorkspacePackages();
        if (packages.length === 0) {
          vscode.window.showErrorMessage(
            'No pnpm workspace packages found. Make sure you have a pnpm-workspace.yaml file.'
          );
          return;
        }

        // Create QuickPick items
        const items = packages.map((pkg: WorkspacePackage) => ({
          label: pkg.isRoot ? `${pkg.name} (Workspace Root)` : pkg.name,
          description: pkg.path,
          package: pkg,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a package to copy its workspace dependencies',
          matchOnDescription: true,
        });

        if (!selected) {
          return;
        }

        const dependencies = await getWorkspaceDependencies(selected.package.name);
        if (dependencies.length === 0) {
          vscode.window.showInformationMessage(`Package "${selected.package.name}" has no workspace dependencies.`);
          return;
        }

        const dependenciesText = dependencies.join('\n');
        await vscode.env.clipboard.writeText(dependenciesText);

        log(`Copied dependencies for ${selected.package.name}: ${dependencies.join(', ')}`);
        vscode.window.showInformationMessage(
          `Copied ${dependencies.length} workspace dependencies for "${selected.package.name}" to clipboard.`
        );
      } catch (error) {
        logError('Failed to copy workspace dependencies', error);
        vscode.window.showErrorMessage('Failed to copy workspace dependencies');
      }
    }
  );

  // Re-scan Workspace Packages
  const rescanWorkspacePackages = vscode.commands.registerCommand(
    'pnpm-workspace.rescanWorkspacePackages',
    async () => {
      log('=================================');
      log('Executing rescanWorkspacePackages command');

      try {
        clearPackageCache();
        const packages = await getWorkspacePackages();

        log(`Re-scanned workspace packages: found ${packages.length} packages`);
        vscode.window.showInformationMessage(`Re-scanned pnpm workspace: found ${packages.length} packages.`);
      } catch (error) {
        logError('Failed to re-scan workspace packages', error);
        vscode.window.showErrorMessage('Failed to re-scan workspace packages');
      }
    }
  );

  context.subscriptions.push(copyWorkspaceDependencies, rescanWorkspacePackages);
}
