import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import { z } from 'zod';
import { getEnabledDependencyTypes } from './config.js';
import { log, logAndShowError, logError } from './logger.js';
import { WorkspacePackage } from './package-scanner.js';
import { PackageJsonSchema } from './schemas.js';

/**
 * Base function to get workspace dependencies as objects with name and path
 */
export async function getWorkspaceDependencies(
  packageName: string,
  packages: WorkspacePackage[]
): Promise<{ name: string; path: string }[]> {
  log('=================================');
  log(`Getting workspace dependency names for: ${packageName}`);
  log(`Available packages: ${packages.map((p) => p.name).join(', ')}`);

  // Find the target package
  const targetPackage = packages.find((pkg) => pkg.name === packageName);
  if (!targetPackage) {
    log(`Target package ${packageName} not found in workspace`);
    return [];
  }

  log(`Found target package: ${targetPackage.name} at ${targetPackage.path}`);

  const dependencies: { name: string; path: string }[] = [];
  const packageJsonUri = Utils.joinPath(targetPackage.uri, 'package.json');

  try {
    const content = await vscode.workspace.fs.readFile(packageJsonUri);
    const packageJsonText = Buffer.from(content).toString('utf8');
    const packageJson = JSON.parse(packageJsonText) as unknown;

    // Validate the package.json structure
    const validatedPackage = PackageJsonSchema.parse(packageJson);

    // Get enabled dependency types from configuration
    const enabledTypes = getEnabledDependencyTypes();
    log(`Enabled dependency types: ${enabledTypes.join(', ')}`);

    // Extract workspace dependencies based on configuration
    const allDeps: Record<string, string> = {};

    if (enabledTypes.includes('dependencies') && validatedPackage.dependencies) {
      Object.assign(allDeps, validatedPackage.dependencies);
      log(`Added ${Object.keys(validatedPackage.dependencies).length} production dependencies`);
    }
    if (enabledTypes.includes('devDependencies') && validatedPackage.devDependencies) {
      Object.assign(allDeps, validatedPackage.devDependencies);
      log(`Added ${Object.keys(validatedPackage.devDependencies).length} dev dependencies`);
    }
    if (enabledTypes.includes('optionalDependencies') && validatedPackage.optionalDependencies) {
      Object.assign(allDeps, validatedPackage.optionalDependencies);
      log(`Added ${Object.keys(validatedPackage.optionalDependencies).length} optional dependencies`);
    }

    log(`Found ${Object.keys(allDeps).length} total dependencies for ${packageName}`);

    for (const [name, version] of Object.entries(allDeps)) {
      log(`Checking dependency: ${name}@${version}`);
      if (typeof version === 'string' && version.startsWith('workspace:')) {
        log(`Found workspace dependency: ${name}`);
        const depPackage = packages.find((pkg) => pkg.name === name);
        if (depPackage) {
          log(`Added workspace dependency: ${name} -> ${depPackage.path}`);
          dependencies.push({ name, path: depPackage.path });
        } else {
          log(`Workspace dependency ${name} not found in packages`);
        }
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = `Invalid package.json format for ${packageName}: ${error.issues.map((i) => i.message).join(', ')}`;
      logAndShowError('Package Validation Error', errorMessage);
    } else {
      logError(`Failed to get dependencies for ${packageName}`, error);
    }
  }

  log(
    `Final workspace dependencies for ${packageName}: [${dependencies.map((d) => `${d.name}:${d.path}`).join(', ')}]`
  );
  return dependencies.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Gets workspace dependency names only
 */
export async function getWorkspaceDependencyNames(
  packageName: string,
  packages: WorkspacePackage[]
): Promise<string[]> {
  const dependencies = await getWorkspaceDependencies(packageName, packages);
  return dependencies.map((dep) => dep.name);
}

/**
 * Gets workspace dependency paths only
 */
export async function getWorkspaceDependencyPaths(
  packageName: string,
  packages: WorkspacePackage[]
): Promise<string[]> {
  const dependencies = await getWorkspaceDependencies(packageName, packages);
  return dependencies.map((dep) => dep.path);
}
