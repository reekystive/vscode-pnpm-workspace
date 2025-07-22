import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import { z } from 'zod';
import { getEnabledDependencyTypes } from './config.js';
import { log, logAndShowError, logError } from './logger.js';

export interface WorkspacePackage {
  name: string;
  path: string;
  uri: vscode.Uri;
  isRoot: boolean;
}

let cachedPackages: WorkspacePackage[] | null = null;

// Zod schemas for validation
const WorkspaceConfigSchema = z.object({
  packages: z.array(z.string()).default([]),
});

const DependencyNameSchema = z.string().min(1, 'Dependency name is required');
const DependencyVersionSchema = z.string().min(1, 'Dependency version is required');

const PackageJsonSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  dependencies: z.record(DependencyNameSchema, DependencyVersionSchema).optional(),
  devDependencies: z.record(DependencyNameSchema, DependencyVersionSchema).optional(),
  optionalDependencies: z.record(DependencyNameSchema, DependencyVersionSchema).optional(),
});

/**
 * Finds all pnpm-workspace.yaml files in opened workspaces
 */
async function findPnpmWorkspaceFiles(): Promise<vscode.Uri[]> {
  log('Searching for pnpm-workspace.yaml files in all workspace folders');

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    log('No workspace folders found');
    return [];
  }

  const workspaceFiles: vscode.Uri[] = [];

  for (const folder of workspaceFolders) {
    log(`Searching in workspace folder: ${folder.name} (${folder.uri.toString()})`);
    try {
      // Look for pnpm-workspace.yaml in each workspace folder
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder, 'pnpm-workspace.yaml'),
        null, // no exclusions
        1 // only need one per workspace
      );

      if (files.length > 0) {
        log(`Found pnpm-workspace.yaml in ${folder.name}: ${files[0].toString()}`);
        workspaceFiles.push(...files);
      } else {
        log(`No pnpm-workspace.yaml found in ${folder.name}`);
      }
    } catch (error) {
      logError(`Failed to search for pnpm-workspace.yaml in ${folder.name}`, error);
    }
  }

  log(`Found ${workspaceFiles.length} pnpm-workspace.yaml files total`);
  return workspaceFiles;
}

/**
 * Loads and validates pnpm-workspace.yaml using js-yaml and zod
 */
async function loadWorkspaceConfig(workspaceFileUri: vscode.Uri): Promise<string[] | null> {
  try {
    log(`Loading workspace config from: ${workspaceFileUri.toString()}`);

    const content = await vscode.workspace.fs.readFile(workspaceFileUri);
    const yamlContent = Buffer.from(content).toString('utf8');

    log('Parsing YAML content with js-yaml');
    const parsedYaml = yaml.load(yamlContent);

    log('Validating workspace config with zod');
    const validatedConfig = WorkspaceConfigSchema.parse(parsedYaml);

    log(`Workspace config validation successful. Found patterns: ${validatedConfig.packages.join(', ')}`);
    return validatedConfig.packages;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = `Invalid pnpm-workspace.yaml format: ${error.issues.map((i) => i.message).join(', ')}`;
      logAndShowError('Workspace Config Validation Error', errorMessage);
      return null;
    } else if (error instanceof yaml.YAMLException) {
      const errorMessage = `Failed to parse pnpm-workspace.yaml: ${error.message}`;
      logAndShowError('YAML Parsing Error', errorMessage);
      return null;
    } else {
      logError('Failed to load workspace config', error);
      vscode.window.showErrorMessage('Failed to load pnpm-workspace.yaml. Check the output for details.');
      return null;
    }
  }
}

/**
 * Discovers packages using VS Code findFiles with glob patterns
 */
async function discoverPackages(workspaceRoot: vscode.Uri, patterns: string[]): Promise<vscode.Uri[]> {
  log(`Discovering packages with patterns: ${patterns.join(', ')}`);
  const packageUris: vscode.Uri[] = [];
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(workspaceRoot);

  if (!workspaceFolder) {
    log(`No workspace folder found for root: ${workspaceRoot.toString()}`);
    return packageUris;
  }

  for (const pattern of patterns) {
    if (pattern.startsWith('!')) {
      // Skip ignore patterns for now - could implement as exclude later
      log(`Skipping ignore pattern: ${pattern}`);
      continue;
    }

    try {
      log(`Searching for packages with pattern: ${pattern}/package.json`);

      // Use VS Code's findFiles API with relative patterns
      const includePattern = new vscode.RelativePattern(workspaceFolder, `${pattern}/package.json`);
      const packageJsonFiles = await vscode.workspace.findFiles(includePattern);

      log(`Found ${packageJsonFiles.length} package.json files for pattern: ${pattern}`);
      packageJsonFiles.forEach((file) => {
        log(`  - ${file.toString()}`);
      });

      packageUris.push(...packageJsonFiles);
    } catch (error) {
      logError(`Failed to discover packages with pattern ${pattern}`, error);
    }
  }

  // Remove duplicates
  const uniqueUris = Array.from(new Set(packageUris.map((uri) => uri.toString()))).map((uriString) =>
    vscode.Uri.parse(uriString)
  );

  log(`Discovered ${uniqueUris.length} unique package.json files`);
  return uniqueUris;
}

/**
 * Loads and validates package.json using zod
 */
async function loadPackageInfo(packageJsonUri: vscode.Uri): Promise<{ name: string; path: string } | null> {
  try {
    log(`Loading package info from: ${packageJsonUri.toString()}`);

    const content = await vscode.workspace.fs.readFile(packageJsonUri);
    const packageJsonText = Buffer.from(content).toString('utf8');
    const packageJson = JSON.parse(packageJsonText) as unknown;

    // Validate with zod
    const validatedPackage = PackageJsonSchema.parse(packageJson);

    const packageDir = Utils.dirname(packageJsonUri);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(packageDir);
    const relativePath = workspaceFolder ? vscode.workspace.asRelativePath(packageDir, false) : packageDir.path;

    log(`Package validation successful: ${validatedPackage.name} at ${relativePath}`);
    return {
      name: validatedPackage.name,
      path: relativePath,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(
        `Invalid package.json format at ${packageJsonUri.toString()}`,
        error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      );
    } else if (error instanceof SyntaxError) {
      logError(`Invalid JSON syntax in ${packageJsonUri.toString()}`, error);
    } else {
      logError(`Failed to load package info from ${packageJsonUri.toString()}`, error);
    }
    return null;
  }
}

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
        packages.push({
          name: rootInfo.name,
          path: rootInfo.path,
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
 * Gets workspace dependencies for a specific package
 */
export async function getWorkspaceDependencies(packageName: string): Promise<string[]> {
  log('=================================');
  log(`Getting workspace dependencies for: ${packageName}`);

  const packages = await getWorkspacePackages();
  log(`Available packages: ${packages.map((p) => p.name).join(', ')}`);

  // Find the target package
  const targetPackage = packages.find((pkg) => pkg.name === packageName);
  if (!targetPackage) {
    log(`Target package ${packageName} not found in workspace`);
    return [];
  }

  log(`Found target package: ${targetPackage.name} at ${targetPackage.path}`);

  const dependencies: string[] = [];
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
          dependencies.push(depPackage.path);
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

  log(`Final workspace dependencies for ${packageName}: [${dependencies.join(', ')}]`);
  return dependencies.sort();
}
