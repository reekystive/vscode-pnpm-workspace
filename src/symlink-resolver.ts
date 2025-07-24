import * as vscode from 'vscode';
import { log, logError } from './logger.js';

// Dynamic imports for Node.js modules (not available in web environment)
const isDesktop = typeof globalThis === 'undefined' || !('window' in globalThis);

let fsModule: typeof import('fs') | null = null;
let pathModule: typeof import('path') | null = null;

async function loadNodeModules() {
  if (!isDesktop) {
    return false;
  }

  try {
    fsModule ??= await import('fs');
    pathModule ??= await import('path');
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves a file or directory path by following symlinks recursively
 * while avoiding infinite loops through cycle detection.
 *
 * @param filePath - The file or directory path to resolve
 * @returns The resolved real path, or null if the path doesn't exist or there's a cycle
 */
export async function resolveSymlinks(filePath: string): Promise<string | null> {
  if (!(await loadNodeModules()) || !fsModule || !pathModule) {
    logError('Symlink resolution not supported in web environment');
    return null;
  }

  const visitedPaths = new Set<string>();
  let currentPath = pathModule.resolve(filePath);

  log(`Starting symlink resolution for: ${currentPath}`);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    // Check for cycles
    if (visitedPaths.has(currentPath)) {
      logError(`Symlink cycle detected at: ${currentPath}`);
      return null;
    }

    visitedPaths.add(currentPath);

    try {
      // Check if path exists
      const stats = await fsModule.promises.lstat(currentPath);

      // If it's not a symlink, we're done
      if (!stats.isSymbolicLink()) {
        log(`Resolved to real path: ${currentPath}`);
        return currentPath;
      }

      // Read the symlink target
      const linkTarget = await fsModule.promises.readlink(currentPath);

      // Resolve relative paths
      const resolvedTarget = pathModule.isAbsolute(linkTarget)
        ? linkTarget
        : pathModule.resolve(pathModule.dirname(currentPath), linkTarget);

      log(`Following symlink: ${currentPath} -> ${resolvedTarget}`);
      currentPath = resolvedTarget;
    } catch (error) {
      logError(`Error resolving symlink at ${currentPath}`, error);
      return null;
    }
  }
}

/**
 * Resolves the full path by resolving symlinks at each directory level
 * from the workspace root down to the target file/directory.
 *
 * @param filePath - The file or directory path to resolve
 * @param workspaceRoot - The workspace root directory to start from
 * @returns The resolved path with all symlinks resolved, or null if resolution fails
 */
export async function resolvePathFromWorkspaceRoot(filePath: string, workspaceRoot: string): Promise<string | null> {
  if (!(await loadNodeModules()) || !pathModule) {
    logError('Path resolution not supported in web environment');
    return null;
  }

  const absolutePath = pathModule.resolve(filePath);
  const absoluteWorkspaceRoot = pathModule.resolve(workspaceRoot);

  // Check if the file is within the workspace
  if (!absolutePath.startsWith(absoluteWorkspaceRoot)) {
    log(`File ${absolutePath} is not within workspace root ${absoluteWorkspaceRoot}`);
    return absolutePath; // Return as-is if not in workspace
  }

  log(`Resolving path from workspace root: ${absolutePath}`);

  // Get the relative path from workspace root
  const relativePath = pathModule.relative(absoluteWorkspaceRoot, absolutePath);
  const pathParts = relativePath.split(pathModule.sep);

  let currentPath = absoluteWorkspaceRoot;
  let resolvedPath = absoluteWorkspaceRoot;

  // Resolve each path segment
  for (const part of pathParts) {
    if (!part) {
      continue;
    } // Skip empty parts

    currentPath = pathModule.join(currentPath, part);
    const resolvedSegment = await resolveSymlinks(currentPath);

    if (resolvedSegment === null) {
      logError(`Failed to resolve segment: ${currentPath}`);
      return null;
    }

    // Update the resolved path
    if (resolvedSegment !== currentPath) {
      // This segment was a symlink, use the resolved target
      resolvedPath = resolvedSegment;
      currentPath = resolvedSegment;
    } else {
      // This segment was not a symlink, append to resolved path
      resolvedPath = pathModule.join(resolvedPath, part);
    }
  }

  log(`Final resolved path: ${resolvedPath}`);
  return resolvedPath;
}

/**
 * Checks if a given path contains any symlinks in its hierarchy
 *
 * @param filePath - The file or directory path to check
 * @param workspaceRoot - The workspace root directory
 * @returns True if the path contains symlinks, false otherwise
 */
export async function containsSymlinks(filePath: string, workspaceRoot: string): Promise<boolean> {
  if (!(await loadNodeModules()) || !fsModule || !pathModule) {
    logError('Symlink detection not supported in web environment');
    return false;
  }

  const absolutePath = pathModule.resolve(filePath);
  const absoluteWorkspaceRoot = pathModule.resolve(workspaceRoot);

  // Check if the file is within the workspace
  if (!absolutePath.startsWith(absoluteWorkspaceRoot)) {
    return false;
  }

  // Get the relative path from workspace root
  const relativePath = pathModule.relative(absoluteWorkspaceRoot, absolutePath);
  const pathParts = relativePath.split(pathModule.sep);

  let currentPath = absoluteWorkspaceRoot;

  // Check each path segment for symlinks
  for (const part of pathParts) {
    if (!part) {
      continue;
    } // Skip empty parts

    currentPath = pathModule.join(currentPath, part);

    try {
      const stats = await fsModule.promises.lstat(currentPath);
      if (stats.isSymbolicLink()) {
        return true;
      }
    } catch (error) {
      // If we can't check a segment, assume no symlinks
      logError(`Error checking path segment ${currentPath}`, error);
      return false;
    }
  }

  return false;
}

/**
 * Reveals the original file in the Explorer view by resolving symlinks
 *
 * @param uri - The URI of the file to reveal
 */
export async function revealOriginalInExplorer(uri: vscode.Uri): Promise<void> {
  if (!(await loadNodeModules()) || !pathModule) {
    vscode.window.showErrorMessage('Reveal Original feature is not supported in web environment.');
    return;
  }

  const filePath = uri.fsPath;

  // Get the workspace folder for this file
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('File is not in a workspace folder.');
    return;
  }

  const workspaceRoot = workspaceFolder.uri.fsPath;

  // Check if the path contains symlinks
  const hasSymlinks = await containsSymlinks(filePath, workspaceRoot);
  if (!hasSymlinks) {
    vscode.window.showInformationMessage('This file is not a symlink or does not contain symlinks in its path.');
    return;
  }

  // Resolve the path
  const resolvedPath = await resolvePathFromWorkspaceRoot(filePath, workspaceRoot);
  if (!resolvedPath) {
    vscode.window.showErrorMessage('Failed to resolve symlinks in the file path.');
    return;
  }

  // Check if the resolved path is different from the original
  if (resolvedPath === pathModule.resolve(filePath)) {
    vscode.window.showInformationMessage('This file is not a symlink or does not contain symlinks in its path.');
    return;
  }

  try {
    // Create URI for the resolved path
    const resolvedUri = vscode.Uri.file(resolvedPath);

    // Reveal the file in the Explorer
    await vscode.commands.executeCommand('revealInExplorer', resolvedUri);

    log(`Revealed original file in explorer: ${filePath} -> ${resolvedPath}`);
  } catch (error) {
    logError('Failed to reveal original file in explorer', error);
    vscode.window.showErrorMessage('Failed to reveal original file in Explorer.');
  }
}
