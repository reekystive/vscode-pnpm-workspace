import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import { z } from 'zod';
import { DEFAULT_EXCLUDE_PATTERNS } from './constants.js';
import { log, logError } from './logger.js';
import { PackageJsonSchema } from './schemas.js';
import { findFilesWithFallback } from './virtual-workspace-workaround.js';

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
    log(`Running enhanced findFiles with virtual workspace support...`);

    // Use the enhanced findFiles function that handles virtual workspaces
    const packageJsonFiles = await findFilesWithFallback(workspaceFolder, includePatterns, excludePatterns);

    log(`Found ${packageJsonFiles.length} package.json files`);

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
    const content = await vscode.workspace.fs.readFile(packageJsonUri);
    const packageJsonText = new TextDecoder('utf-8').decode(content);
    const packageJson = JSON.parse(packageJsonText) as unknown;

    // Validate with zod
    const validatedPackage = PackageJsonSchema.parse(packageJson);

    const packageDir = Utils.dirname(packageJsonUri);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(packageDir);

    let relativePath: string;
    if (workspaceFolder) {
      // Use asRelativePath first
      const vsCodeRelativePath = vscode.workspace.asRelativePath(packageDir, false);

      // Check if asRelativePath worked correctly (returned a relative path)
      if (vsCodeRelativePath.startsWith('/') || (vsCodeRelativePath.length > 1 && vsCodeRelativePath[1] === ':')) {
        // asRelativePath returned an absolute path, compute manually using URI operations
        try {
          const workspaceUri = workspaceFolder.uri;
          const packageUri = packageDir;

          // Use URI-based path operations that work in virtual workspaces
          const workspacePath = workspaceUri.path;
          const packagePath = packageUri.path;

          if (packagePath.startsWith(workspacePath)) {
            // Remove workspace path prefix and normalize separators
            relativePath = packagePath.substring(workspacePath.length);
            // Remove leading slash if present
            if (relativePath.startsWith('/')) {
              relativePath = relativePath.substring(1);
            }
            // Ensure forward slashes for consistency
            relativePath = relativePath.replace(/\\/g, '/');
          } else {
            // Fallback to the original result if path doesn't match
            relativePath = vsCodeRelativePath;
          }
        } catch {
          // If URI operations fail, use the original result
          relativePath = vsCodeRelativePath;
        }
      } else {
        relativePath = vsCodeRelativePath;
      }
    } else {
      // Use URI path instead of fsPath for virtual workspace compatibility
      relativePath = packageDir.path;
    }

    log(`Loaded package: ${validatedPackage.name} at ${relativePath}`);
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
