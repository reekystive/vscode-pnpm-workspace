import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { z } from 'zod';
import { log, logAndShowError, logError } from './logger.js';
import { WorkspaceConfigSchema } from './schemas.js';

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
export async function loadWorkspaceConfig(workspaceFileUri: vscode.Uri): Promise<string[] | null> {
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
