import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { z } from 'zod';
import { log, logAndShowError, logError } from './logger.js';
import { WorkspaceConfigSchema } from './schemas.js';
import { findSingleFile } from './virtual-workspace-workaround.js';

/**
 * Finds all pnpm-workspace.yaml files in opened workspaces
 */
export async function findPnpmWorkspaceFiles(): Promise<vscode.Uri[]> {
  log('Searching for pnpm-workspace.yaml files in all workspace folders');

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    log('No workspace folders found');
    return [];
  }

  const workspaceFiles: vscode.Uri[] = [];

  for (const folder of workspaceFolders) {
    log(`Searching in workspace folder: ${folder.name}`);

    try {
      const files = await findSingleFile(folder, 'pnpm-workspace.yaml');

      if (files.length > 0) {
        log(`Found pnpm-workspace.yaml in ${folder.name}`);
        workspaceFiles.push(...files);
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
export async function loadWorkspaceConfig(workspaceFileUri: vscode.Uri): Promise<string[] | null> {
  try {
    const content = await vscode.workspace.fs.readFile(workspaceFileUri);
    const yamlContent = new TextDecoder('utf-8').decode(content);
    const parsedYaml = yaml.load(yamlContent);
    const validatedConfig = WorkspaceConfigSchema.parse(parsedYaml);

    log(`Loaded workspace config with ${validatedConfig.packages.length} patterns`);
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
