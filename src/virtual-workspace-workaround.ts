import * as vscode from 'vscode';

/**
 * Virtual Workspace File Discovery Workaround
 *
 * WORKAROUND FOR VSCODE ISSUE #249197:
 * https://github.com/microsoft/vscode/issues/249197
 *
 * The vscode.workspace.findFiles API fails to work properly in virtual workspaces
 * (e.g., vscode-test-web://, GitHub Codespaces, etc.) when using complex glob patterns.
 * Even simple patterns like "packages/star/package.json" return 0 results despite
 * the files existing and being accessible via direct fs.stat calls.
 *
 * This module provides fallback implementations that manually traverse directories
 * using vscode.workspace.fs APIs, which work correctly in virtual workspaces.
 */

/**
 * Check if the current workspace is a virtual workspace where findFiles might fail
 */
export function isVirtualWorkspace(workspaceFolder: vscode.WorkspaceFolder): boolean {
  return workspaceFolder.uri.scheme !== 'file';
}

/**
 * Manually find files by pattern using file system traversal
 * This is needed for virtual workspaces where findFiles doesn't work properly
 *
 * @param workspaceUri - The root workspace URI
 * @param pattern - Glob pattern like "packages/star/package.json"
 * @param excludePatterns - Patterns to exclude from search
 * @returns Array of file URIs matching the pattern
 */
export async function findFilesByPattern(
  workspaceUri: vscode.Uri,
  pattern: string,
  excludePatterns: string[]
): Promise<vscode.Uri[]> {
  const results: vscode.Uri[] = [];

  if (!pattern.endsWith('/package.json')) {
    return results;
  }

  const dirPattern = pattern.substring(0, pattern.length - '/package.json'.length);

  // Split by /* to find the base directory and wildcard levels
  const parts = dirPattern.split('/');
  const wildcardIndex = parts.findIndex((part) => part === '*');

  if (wildcardIndex === -1) {
    // No wildcard, exact path
    const exactUri = vscode.Uri.joinPath(workspaceUri, dirPattern, 'package.json');
    try {
      await vscode.workspace.fs.stat(exactUri);
      if (!isExcluded(dirPattern, excludePatterns)) {
        results.push(exactUri);
      }
    } catch {
      // File doesn't exist
    }
  } else {
    const baseDir = parts.slice(0, wildcardIndex).join('/');
    const remainingPattern = parts.slice(wildcardIndex + 1);
    const baseDirUri = baseDir ? vscode.Uri.joinPath(workspaceUri, baseDir) : workspaceUri;

    try {
      const entries = await vscode.workspace.fs.readDirectory(baseDirUri);
      const subdirs = entries.filter(([, type]) => type === vscode.FileType.Directory).map(([name]) => name);

      for (const subdir of subdirs) {
        const subdirPath = baseDir ? `${baseDir}/${subdir}` : subdir;

        if (isExcluded(subdirPath, excludePatterns)) {
          continue;
        }

        if (remainingPattern.length === 0) {
          const packageJsonUri = vscode.Uri.joinPath(baseDirUri, subdir, 'package.json');
          try {
            await vscode.workspace.fs.stat(packageJsonUri);
            results.push(packageJsonUri);
          } catch {
            // No package.json in this directory
          }
        } else {
          const deeperPattern = `${subdirPath}/${remainingPattern.join('/')}/package.json`;
          const deeperResults = await findFilesByPattern(workspaceUri, deeperPattern, excludePatterns);
          results.push(...deeperResults);
        }
      }
    } catch {
      // Failed to read directory
    }
  }

  return results;
}

/**
 * Find a single file by exact path with fallback for virtual workspaces
 *
 * @param workspaceFolder - The workspace folder to search in
 * @param fileName - Exact file name to find (e.g., "pnpm-workspace.yaml")
 * @returns Array of matching file URIs (usually 0 or 1 element)
 */
export async function findSingleFile(workspaceFolder: vscode.WorkspaceFolder, fileName: string): Promise<vscode.Uri[]> {
  // First try the standard findFiles API
  try {
    const excludeGlob = '{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.next/**,**/coverage/**}';
    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(workspaceFolder, fileName),
      excludeGlob,
      1
    );

    if (files.length > 0) {
      return files;
    }
  } catch {
    // findFiles failed
  }

  // Fallback: direct file check for virtual workspaces
  if (isVirtualWorkspace(workspaceFolder)) {
    const directCheckUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
    try {
      await vscode.workspace.fs.stat(directCheckUri);
      return [directCheckUri];
    } catch {
      // File not found
    }
  }

  return [];
}

/**
 * Enhanced findFiles with virtual workspace support
 *
 * @param workspaceFolder - The workspace folder to search in
 * @param patterns - Array of glob patterns to search for
 * @param excludePatterns - Array of patterns to exclude
 * @returns Array of matching file URIs
 */
export async function findFilesWithFallback(
  workspaceFolder: vscode.WorkspaceFolder,
  patterns: string[],
  excludePatterns: string[]
): Promise<vscode.Uri[]> {
  // First try the standard findFiles API with combined pattern
  const includeGlob = new vscode.RelativePattern(workspaceFolder, `{${patterns.join(',')}}`);
  const excludeGlob = `{${excludePatterns.join(',')}}`;

  try {
    const files = await vscode.workspace.findFiles(includeGlob, excludeGlob);

    if (files.length > 0 || !isVirtualWorkspace(workspaceFolder)) {
      return files;
    }
  } catch {
    // findFiles failed
  }

  // Fallback for virtual workspaces: try each pattern individually
  if (isVirtualWorkspace(workspaceFolder)) {
    const allResults: vscode.Uri[] = [];

    for (const pattern of patterns) {
      try {
        const matches = await findFilesByPattern(workspaceFolder.uri, pattern, excludePatterns);
        allResults.push(...matches);
      } catch {
        // Pattern failed
      }
    }

    // Remove duplicates
    const uniqueResults = allResults.filter(
      (uri, index, array) => array.findIndex((other) => other.toString() === uri.toString()) === index
    );

    return uniqueResults;
  }

  return [];
}

/**
 * Check if a path should be excluded based on exclude patterns
 */
function isExcluded(path: string, excludePatterns: string[]): boolean {
  for (const pattern of excludePatterns) {
    // Simple pattern matching - can be enhanced later
    if (pattern.includes('*')) {
      // Handle wildcard patterns
      const regexPattern = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(path)) {
        return true;
      }
    } else {
      // Exact match or prefix match
      if (path === pattern || path.startsWith(pattern + '/')) {
        return true;
      }
    }
  }
  return false;
}
