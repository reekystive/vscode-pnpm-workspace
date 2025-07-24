# pnpm Workspace

A comprehensive VS Code extension providing productivity tools for pnpm workspace projects. This extension aims to streamline your monorepo development workflow with a suite of workspace-specific utilities.

View this extension on [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=reekystive.pnpm-workspace) or [Open VSX](https://open-vsx.org/extension/reekystive/pnpm-workspace).

## 🚀 Current Features

**Workspace Productivity Tools** - Comprehensive utilities for pnpm workspace projects!

- **Copy Workspace Dependency Names**: Select any package in your pnpm workspace and copy its workspace dependency names to clipboard, with each dependency on a new line
- **Copy Workspace Dependency Paths**: Select any package in your pnpm workspace and copy its workspace dependency paths to clipboard, with each dependency path on a new line
- **Search in Package and Workspace Dependencies**: Select a package and open VS Code search with the package and all its workspace dependencies pre-filled in the search scope
- **Reveal Original in Explorer View**: Quickly navigate from symlinked files (especially in `node_modules`) to their original locations in workspace packages
- **Re-scan Workspace**: Manually refresh the workspace package cache when needed
- **Web Extension Support**: Works in VS Code for the Web and remote development environments (symlink features are desktop-only)
- **Workspace Root Support**: Includes the workspace root package with special marking

## 🔮 Planned Features

More productivity tools are coming soon! Future releases will include:

- Package dependency visualization
- Workspace navigation shortcuts
- Build script management across packages
- Inter-package dependency analysis
- And many more workspace utilities...

## Commands

This extension contributes the following commands:

- `pnpm Workspace: Copy Workspace Dependency Names Of...` - Opens a quick picker to select a package and copies its workspace dependency names
- `pnpm Workspace: Copy Workspace Dependency Paths Of...` - Opens a quick picker to select a package and copies its workspace dependency paths
- `pnpm Workspace: Search in Package and Workspace Dependencies...` - Opens a quick picker to select a package and opens search with the package and its dependencies
- `pnpm Workspace: Reveal Original in Explorer View` - Reveals the original file location for symlinked files (desktop only)
- `pnpm Workspace: Re-scan Workspace Packages` - Clears the package cache and re-scans the workspace

## Usage

### Copy Workspace Dependency Names

1. Open a pnpm workspace (a project with `pnpm-workspace.yaml`)
2. Run `pnpm Workspace: Copy Workspace Dependency Names Of...` from the Command Palette
3. Select the package you want to get dependencies for
4. The workspace dependency names will be copied to your clipboard, separated by newlines

### Copy Workspace Dependency Paths

1. Open a pnpm workspace (a project with `pnpm-workspace.yaml`)
2. Run `pnpm Workspace: Copy Workspace Dependency Paths Of...` from the Command Palette
3. Select the package you want to get dependency paths for
4. The workspace dependency paths will be copied to your clipboard, separated by newlines

### Search in Package and Workspace Dependencies

1. Open a pnpm workspace (a project with `pnpm-workspace.yaml`)
2. Run `pnpm Workspace: Search in Package and Workspace Dependencies...` from the Command Palette
3. Select the package you want to search in along with its dependencies
4. VS Code's search panel will open with the package and its workspace dependencies pre-filled in the "files to include" field
5. Enter your search term and the search will be scoped to only those packages

### Reveal Original in Explorer View

Perfect for pnpm workspaces where packages are symlinked into `node_modules`! This feature helps you quickly navigate from symlinked files to their original locations.

**Using the Context Menu:**

1. Right-click on any file or folder in the Explorer view
2. Select "Reveal Original in Explorer View" from the context menu
3. If the file/folder is a symlink or contains symlinks in its path, VS Code will reveal the original location

**Using the Command Palette:**

1. Open any file in the editor (or ensure the file is selected in Explorer)
2. Run `pnpm Workspace: Reveal Original in Explorer View` from the Command Palette
3. The original file location will be revealed in Explorer

**Features:**

- Intelligent symlink resolution with cycle detection
- Multi-level symlink resolution (handles complex symlink chains)
- Works with files and folders inside symlinked directories
- User-friendly feedback for non-symlink files
- Desktop-only feature (requires Node.js filesystem APIs)

The extension automatically scans your workspace on first use and caches the results. Use the re-scan command if you've added or removed packages.

## Configuration

You can customize which types of dependencies to include when copying workspace dependencies:

| Setting                                                               | Default | Description                      |
| --------------------------------------------------------------------- | ------- | -------------------------------- |
| `pnpmWorkspace.copyWorkspaceDependencies.includeDependencies`         | `true`  | Include production dependencies  |
| `pnpmWorkspace.copyWorkspaceDependencies.includeDevDependencies`      | `true`  | Include development dependencies |
| `pnpmWorkspace.copyWorkspaceDependencies.includeOptionalDependencies` | `true`  | Include optional dependencies    |

To configure these settings:

1. Open VS Code Settings (Ctrl+, / Cmd+,)
2. Search for "pnpm Workspace"
3. Toggle the checkboxes for the dependency types you want to include

## Requirements

- A valid `pnpm-workspace.yaml` file in your workspace root
- VS Code 1.99.0 or higher

## How it Works

The extension:

1. Looks for `pnpm-workspace.yaml` in your workspace
2. Discovers all packages based on the workspace patterns
3. Parses each `package.json` to find workspace dependencies (dependencies starting with `workspace:`)
4. Provides a quick picker interface to select and copy dependencies

## Platform Support

This extension works in multiple environments:

- **VS Code Desktop**: Full feature support including symlink resolution
- **VS Code for the Web**: Core workspace features (symlink resolution not available)
- **Remote development environments**: Full feature support
- **Virtual workspaces**: Full feature support

**Note**: The "Reveal Original in Explorer View" feature requires Node.js filesystem APIs and is only available in desktop environments.

## License

MIT

## Contributing

Found a bug or have a feature request? Please [open an issue](https://github.com/reekystive/vscode-pnpm-workspace/issues).
