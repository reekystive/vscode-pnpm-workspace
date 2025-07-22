import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import { log } from './logger.js';
import { WorkspacePackage, discoverPackages, loadPackageInfo } from './package-scanner.js';
import {
  getWorkspaceDependencies as getWorkspaceDependenciesFromPackage,
  getWorkspaceDependencyNames as getWorkspaceDependencyNamesFromPackage,
  getWorkspaceDependencyPaths as getWorkspaceDependencyPathsFromPackage,
} from './workspace-dependencies.js';
import { findPnpmWorkspaceFiles, loadWorkspaceConfig } from './workspace-discovery.js';

// Re-export WorkspacePackage interface for external use
export { WorkspacePackage };

let cachedPackages: WorkspacePackage[] | null = null;

/**
 * Scans all workspace folders for pnpm workspace packages
 */
export async function scanWorkspacePackages(): Promise<WorkspacePackage[]> {
  log('=================================');
  log('Starting comprehensive workspace packages scan');
  const allPackages: WorkspacePackage[] = [];

  // Find all pnpm-workspace.yaml files across all workspace folders
  const workspaceFiles = await findPnpmWorkspaceFiles();

  if (workspaceFiles.length === 0) {
    const message = 'No pnpm-workspace.yaml files found in any opened workspace folders';
    log(message);
    vscode.window.showWarningMessage(message);
    return allPackages;
  }

  // Process each workspace
  for (const workspaceFile of workspaceFiles) {
    log(`\n--- Processing workspace: ${workspaceFile.toString()} ---`);

    const workspaceRoot = Utils.dirname(workspaceFile);
    const packages: WorkspacePackage[] = [];

    // Add workspace root package if it exists
    const rootPackageJson = Utils.joinPath(workspaceRoot, 'package.json');
    try {
      await vscode.workspace.fs.stat(rootPackageJson);
      const rootInfo = await loadPackageInfo(rootPackageJson);
      if (rootInfo) {
        log(`Found workspace root package: ${rootInfo.name}`);

        // For workspace root, determine the correct relative path
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(workspaceRoot);
        let rootPath: string;
        if (workspaceFolder && workspaceFolder.uri.toString() === workspaceRoot.toString()) {
          // If this workspace root is the same as VS Code's workspace folder root, use "."
          rootPath = '.';
        } else {
          // Otherwise, use the relative path from the current workspace folder
          rootPath = workspaceFolder ? vscode.workspace.asRelativePath(workspaceRoot, false) : rootInfo.path;
        }

        log(`Workspace root path determined as: "${rootPath}"`);
        packages.push({
          name: rootInfo.name,
          path: rootPath,
          uri: workspaceRoot,
          isRoot: true,
        });
      }
    } catch {
      log('No package.json found in workspace root');
    }

    // Load workspace configuration
    const workspacePatterns = await loadWorkspaceConfig(workspaceFile);
    if (!workspacePatterns) {
      continue; // Error already logged and shown to user
    }

    if (workspacePatterns.length === 0) {
      log('No packages patterns found in pnpm-workspace.yaml');
      continue;
    }

    // Discover all package.json files
    const packageUris = await discoverPackages(workspaceRoot, workspacePatterns);

    // Load package information
    for (const packageUri of packageUris) {
      const packageInfo = await loadPackageInfo(packageUri);
      if (packageInfo) {
        const packageDir = Utils.dirname(packageUri);
        packages.push({
          name: packageInfo.name,
          path: packageInfo.path,
          uri: packageDir,
          isRoot: false,
        });
      }
    }

    log(`Workspace ${Utils.basename(workspaceRoot)} contributed ${packages.length} packages`);
    allPackages.push(...packages);
  }

  log(`\n--- Scan Summary ---`);
  log(`Total packages discovered: ${allPackages.length}`);
  allPackages.forEach((pkg) => {
    log(`Package: ${pkg.name} (${pkg.path}) ${pkg.isRoot ? '(root)' : ''}`);
  });

  // Check for duplicate package names across workspaces
  const packageNames = allPackages.map((pkg) => pkg.name);
  const duplicates = packageNames.filter((name, index) => packageNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    const uniqueDuplicates = [...new Set(duplicates)];
    const warningMessage = `Warning: Found duplicate package names across workspaces: ${uniqueDuplicates.join(', ')}`;
    log(warningMessage);
    vscode.window.showWarningMessage(warningMessage);
  }

  cachedPackages = allPackages;
  return allPackages;
}

/**
 * Gets cached packages or scans if not cached
 */
export async function getWorkspacePackages(): Promise<WorkspacePackage[]> {
  if (cachedPackages === null) {
    log('No cached packages found, initiating scan');
    return await scanWorkspacePackages();
  }
  log(`Returning ${cachedPackages.length} cached packages`);
  return cachedPackages;
}

/**
 * Clears the package cache
 */
export function clearPackageCache(): void {
  cachedPackages = null;
  log('Package cache cleared');
}

/**
 * Gets workspace dependency names for a specific package
 */
export async function getWorkspaceDependencyNames(packageName: string): Promise<string[]> {
  const packages = await getWorkspacePackages();
  return await getWorkspaceDependencyNamesFromPackage(packageName, packages);
}

/**
 * Gets workspace dependencies as objects with name and path
 */
export async function getWorkspaceDependencies(packageName: string): Promise<{ name: string; path: string }[]> {
  const packages = await getWorkspacePackages();
  return await getWorkspaceDependenciesFromPackage(packageName, packages);
}

/**
 * Gets workspace dependency paths only
 */
export async function getWorkspaceDependencyPaths(packageName: string): Promise<string[]> {
  const packages = await getWorkspacePackages();
  return await getWorkspaceDependencyPathsFromPackage(packageName, packages);
}

/**
 * Gets all paths for a package and its workspace dependencies (for searching)
 */
export async function getPackageAndDependencyPaths(packageName: string): Promise<string[]> {
  const packages = await getWorkspacePackages();

  // Find the target package
  const targetPackage = packages.find((pkg) => pkg.name === packageName);
  if (!targetPackage) {
    log(`Target package ${packageName} not found in workspace`);
    return [];
  }

  const allPaths: string[] = [];

  // Add the target package path first, but skip if it's the workspace root (current directory)
  if (targetPackage.path && targetPackage.path !== '.') {
    allPaths.push(targetPackage.path);
    log(`Added target package path: ${targetPackage.path}`);
  } else {
    log(`Skipping target package path (workspace root): ${targetPackage.path}`);
  }

  // Get workspace dependency paths
  const dependencyPaths = await getWorkspaceDependencyPathsFromPackage(packageName, packages);
  allPaths.push(...dependencyPaths);

  log(`Final paths for search (${packageName} + dependencies): [${allPaths.join(', ')}]`);
  return allPaths;
}
