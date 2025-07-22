import * as vscode from 'vscode';
import { log, logError } from './logger.js';
import {
  clearPackageCache,
  getWorkspaceDependencies,
  getWorkspaceDependencyNames,
  getWorkspacePackages,
  type WorkspacePackage,
} from './pnpm-workspace.js';

export function registerCommands(context: vscode.ExtensionContext) {
  // Copy Workspace Dependency Names Of...
  const copyWorkspaceDependencyNames = vscode.commands.registerCommand(
    'pnpm-workspace.copyWorkspaceDependencyNamesOf',
    async () => {
      log('=================================');
      log('Executing copyWorkspaceDependencies command');

      try {
        // Create and show QuickPick immediately with loading state
        const quickPick = vscode.window.createQuickPick();
        quickPick.placeholder = 'Select a package to copy its workspace dependencies';
        quickPick.matchOnDescription = true;
        quickPick.busy = true;
        quickPick.items = [{ label: 'Loading packages...', description: 'Scanning workspace' }];
        quickPick.show();

        let packages: WorkspacePackage[];
        try {
          // Load packages in background
          packages = await getWorkspacePackages();
        } catch (error) {
          quickPick.hide();
          logError('Failed to load workspace packages', error);
          vscode.window.showErrorMessage('Failed to load workspace packages');
          return;
        }

        if (packages.length === 0) {
          quickPick.hide();
          vscode.window.showErrorMessage(
            'No pnpm workspace packages found. Make sure you have a pnpm-workspace.yaml file.'
          );
          return;
        }

        // Update QuickPick with actual packages
        interface QuickPickItemWithPackage extends vscode.QuickPickItem {
          package: WorkspacePackage;
        }

        const items: QuickPickItemWithPackage[] = packages
          .sort((a, b) => {
            // Workspace root always comes first
            if (a.isRoot && !b.isRoot) {
              return -1;
            }
            if (!a.isRoot && b.isRoot) {
              return 1;
            }
            // @ packages come after regular packages
            const aStartsWithAt = a.name.startsWith('@');
            const bStartsWithAt = b.name.startsWith('@');
            if (!aStartsWithAt && bStartsWithAt) {
              return -1;
            }
            if (aStartsWithAt && !bStartsWithAt) {
              return 1;
            }
            // Otherwise sort alphabetically by name
            return a.name.localeCompare(b.name);
          })
          .map((pkg: WorkspacePackage) => ({
            label: pkg.isRoot ? `${pkg.name} (Workspace Root)` : pkg.name,
            description: pkg.path,
            package: pkg,
          }));

        quickPick.busy = false;
        quickPick.items = items;

        // Wait for user selection
        const selected = await new Promise<QuickPickItemWithPackage | undefined>((resolve) => {
          quickPick.onDidAccept(() => {
            const selection = quickPick.selectedItems[0] as QuickPickItemWithPackage;
            quickPick.hide();
            resolve(selection);
          });
          quickPick.onDidHide(() => {
            resolve(undefined);
          });
        });

        if (!selected) {
          return;
        }

        const dependencyNames = await getWorkspaceDependencyNames(selected.package.name);
        if (dependencyNames.length === 0) {
          vscode.window.showInformationMessage(`Package "${selected.package.name}" has no workspace dependencies.`);
          return;
        }

        const dependencyNamesText = dependencyNames.join('\n');
        await vscode.env.clipboard.writeText(dependencyNamesText);

        log(`Copied dependency names for ${selected.package.name}: ${dependencyNames.join(', ')}`);
        vscode.window.showInformationMessage(
          `Copied ${dependencyNames.length} workspace dependency names for "${selected.package.name}" to clipboard.`
        );
      } catch (error) {
        logError('Failed to copy workspace dependencies', error);
        vscode.window.showErrorMessage('Failed to copy workspace dependencies');
      }
    }
  );

  // Copy Workspace Dependency Paths Of...
  const copyWorkspaceDependencyPaths = vscode.commands.registerCommand(
    'pnpm-workspace.copyWorkspaceDependencyPathsOf',
    async () => {
      log('=================================');
      log('Executing copyWorkspaceDependencyPaths command');

      try {
        // Create and show QuickPick immediately with loading state
        const quickPick = vscode.window.createQuickPick();
        quickPick.placeholder = 'Select a package to copy its workspace dependency paths';
        quickPick.matchOnDescription = true;
        quickPick.busy = true;
        quickPick.items = [{ label: 'Loading packages...', description: 'Scanning workspace' }];
        quickPick.show();

        let packages: WorkspacePackage[];
        try {
          // Load packages in background
          packages = await getWorkspacePackages();
        } catch (error) {
          quickPick.hide();
          logError('Failed to load workspace packages', error);
          vscode.window.showErrorMessage('Failed to load workspace packages');
          return;
        }

        if (packages.length === 0) {
          quickPick.hide();
          vscode.window.showErrorMessage(
            'No pnpm workspace packages found. Make sure you have a pnpm-workspace.yaml file.'
          );
          return;
        }

        // Update QuickPick with actual packages
        interface QuickPickItemWithPackage extends vscode.QuickPickItem {
          package: WorkspacePackage;
        }

        const items: QuickPickItemWithPackage[] = packages
          .sort((a, b) => {
            // Workspace root always comes first
            if (a.isRoot && !b.isRoot) {
              return -1;
            }
            if (!a.isRoot && b.isRoot) {
              return 1;
            }
            // @ packages come after regular packages
            const aStartsWithAt = a.name.startsWith('@');
            const bStartsWithAt = b.name.startsWith('@');
            if (!aStartsWithAt && bStartsWithAt) {
              return -1;
            }
            if (aStartsWithAt && !bStartsWithAt) {
              return 1;
            }
            // Otherwise sort alphabetically by name
            return a.name.localeCompare(b.name);
          })
          .map((pkg: WorkspacePackage) => ({
            label: pkg.isRoot ? `${pkg.name} (Workspace Root)` : pkg.name,
            description: pkg.path,
            package: pkg,
          }));

        quickPick.busy = false;
        quickPick.items = items;

        // Wait for user selection
        const selected = await new Promise<QuickPickItemWithPackage | undefined>((resolve) => {
          quickPick.onDidAccept(() => {
            const selection = quickPick.selectedItems[0] as QuickPickItemWithPackage;
            quickPick.hide();
            resolve(selection);
          });
          quickPick.onDidHide(() => {
            resolve(undefined);
          });
        });

        if (!selected) {
          return;
        }

        const dependencyPaths = await getWorkspaceDependencies(selected.package.name);
        if (dependencyPaths.length === 0) {
          vscode.window.showInformationMessage(`Package "${selected.package.name}" has no workspace dependencies.`);
          return;
        }

        const dependencyPathsText = dependencyPaths.join('\n');
        await vscode.env.clipboard.writeText(dependencyPathsText);

        log(`Copied dependency paths for ${selected.package.name}: ${dependencyPaths.join(', ')}`);
        vscode.window.showInformationMessage(
          `Copied ${dependencyPaths.length} workspace dependency paths for "${selected.package.name}" to clipboard.`
        );
      } catch (error) {
        logError('Failed to copy workspace dependency paths', error);
        vscode.window.showErrorMessage('Failed to copy workspace dependency paths');
      }
    }
  );

  // Re-scan Workspace Packages
  const rescanWorkspacePackages = vscode.commands.registerCommand(
    'pnpm-workspace.rescanWorkspacePackages',
    async () => {
      log('=================================');
      log('Executing rescanWorkspacePackages command');

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Re-scanning pnpm workspace',
          cancellable: false,
        },
        async (progress, _token) => {
          try {
            clearPackageCache();
            log('Cleared package cache');

            progress.report({ increment: 30, message: 'Scanning packages...' });
            const packages = await getWorkspacePackages();
            progress.report({ increment: 100, message: `Found ${packages.length} packages` });

            log(`Re-scanned workspace packages: found ${packages.length} packages`);
            vscode.window.showInformationMessage(`Re-scanned pnpm workspace: found ${packages.length} packages.`);
          } catch (error) {
            logError('Failed to re-scan workspace packages', error);
            vscode.window.showErrorMessage('Failed to re-scan workspace packages. Check output for details.');
            throw error;
          }
        }
      );
    }
  );

  context.subscriptions.push(copyWorkspaceDependencyNames, copyWorkspaceDependencyPaths, rescanWorkspacePackages);
}
