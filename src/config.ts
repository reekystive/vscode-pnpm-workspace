import * as vscode from 'vscode';

export type DependencyType = 'dependencies' | 'devDependencies' | 'optionalDependencies';

export interface CopyWorkspaceDependenciesConfig {
  includeDependencies: boolean;
  includeDevDependencies: boolean;
  includeOptionalDependencies: boolean;
}

/**
 * Gets the current copy workspace dependencies configuration from VS Code settings
 */
export function getCopyWorkspaceDependenciesConfig(): CopyWorkspaceDependenciesConfig {
  const config = vscode.workspace.getConfiguration('pnpmWorkspace');

  return {
    includeDependencies: config.get('copyWorkspaceDependencies.includeDependencies', true),
    includeDevDependencies: config.get('copyWorkspaceDependencies.includeDevDependencies', true),
    includeOptionalDependencies: config.get('copyWorkspaceDependencies.includeOptionalDependencies', true),
  };
}

/**
 * Gets enabled dependency types based on current configuration
 */
export function getEnabledDependencyTypes(): DependencyType[] {
  const config = getCopyWorkspaceDependenciesConfig();
  const types: DependencyType[] = [];

  if (config.includeDependencies) {
    types.push('dependencies');
  }
  if (config.includeDevDependencies) {
    types.push('devDependencies');
  }
  if (config.includeOptionalDependencies) {
    types.push('optionalDependencies');
  }

  return types;
}
