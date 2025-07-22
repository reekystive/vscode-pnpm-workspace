import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import { z } from 'zod';
import { log, logError } from './logger.js';
import { PackageJsonSchema } from './schemas.js';

export interface WorkspacePackage {
  name: string;
  path: string;
  uri: vscode.Uri;
  isRoot: boolean;
}

/**
 * Discovers packages using VS Code findFiles with glob patterns
 */
export async function discoverPackages(workspaceRoot: vscode.Uri, patterns: string[]): Promise<vscode.Uri[]> {
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
export async function loadPackageInfo(packageJsonUri: vscode.Uri): Promise<{ name: string; path: string } | null> {
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
