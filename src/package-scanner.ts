import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import { z } from 'zod';
import { DEFAULT_EXCLUDE_PATTERNS } from './constants.js';
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
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(workspaceRoot);

  if (!workspaceFolder) {
    log(`No workspace folder found for root: ${workspaceRoot.toString()}`);
    return [];
  }

  // Separate include patterns from exclude patterns
  const includePatterns: string[] = [];
  const excludePatterns: string[] = [...DEFAULT_EXCLUDE_PATTERNS];

  for (const pattern of patterns) {
    if (pattern.startsWith('!')) {
      // Add to exclude patterns (remove the '!' prefix)
      excludePatterns.push(pattern.slice(1));
      log(`Added exclude pattern: ${pattern.slice(1)}`);
    } else {
      // Add to include patterns with /package.json suffix
      includePatterns.push(`${pattern}/package.json`);
    }
  }

  if (includePatterns.length === 0) {
    log('No include patterns found');
    return [];
  }

  try {
    log(`Searching for packages with patterns: {${includePatterns.join(',')}}`);
    log(`Excluding patterns: {${excludePatterns.join(',')}}`);

    // Use VS Code's findFiles API with combined glob pattern
    const includeGlob = new vscode.RelativePattern(workspaceFolder, `{${includePatterns.join(',')}}`);
    const excludeGlob = `{${excludePatterns.join(',')}}`;

    const packageJsonFiles = await vscode.workspace.findFiles(includeGlob, excludeGlob);

    log(`Found ${packageJsonFiles.length} package.json files`);
    packageJsonFiles.forEach((file) => {
      log(`  - ${file.toString()}`);
    });

    return packageJsonFiles;
  } catch (error) {
    logError('Failed to discover packages', error);
    return [];
  }
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
