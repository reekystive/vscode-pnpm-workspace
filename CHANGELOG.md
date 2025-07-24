<!-- markdownlint-disable MD024 -->

# Change Log

All notable changes to the pnpm Workspace Dependencies extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.4.1] - 2025-07-24

### Added

- **Reveal Original in Explorer View**: New feature to quickly navigate from symlinked files to their original locations
  - Command: `pnpm Workspace: Reveal Original in Explorer View` - Reveals the original file location for symlinked files
  - Context menu item in Explorer view for files - Right-click on any file to reveal its original location
  - Intelligent symlink resolution with cycle detection to handle complex symlink chains
  - Multi-level symlink resolution that follows symlinks at each directory level from workspace root
  - User feedback for non-symlink files to inform when no action is needed
  - Perfect for pnpm workspace users who need to quickly find original files in `node_modules` symlinks
- **Reveal Workspace Package in Explorer View**: New command to quickly navigate to workspace packages
  - Command: `pnpm Workspace: Reveal Workspace Package in Explorer View...` - Opens a quick picker to select and reveal workspace packages
  - Uses familiar quick picker interface with workspace root prioritization and alphabetical sorting
  - Ideal for quickly jumping to specific packages in large monorepos

## [0.4.0] - 2025-07-23

### Added

- **Virtual Workspace Support**: Added comprehensive support for virtual workspaces (vscode-test-web, GitHub Codespaces, etc.)
  - Implemented workaround for VSCode issue [#249197](https://github.com/microsoft/vscode/issues/249197) where `workspace.findFiles` fails in virtual workspaces
  - Added fallback manual directory traversal using `workspace.fs` APIs when `findFiles` returns no results
  - Replaced `fsPath` usage with URI-based path operations for cross-platform compatibility
  - Extension now works correctly in both traditional file system and virtual workspace environments

## [0.2.4] - 2025-07-23

### Changed

- Improved search path formatting - Changed separator from comma-space (', ') to curly braces with glob pattern (`{a,b,c}/**/*`) for better file matching

## [0.2.3] - 2025-07-23

### Fixed

- Replaced Buffer.from with TextDecoder for better web extension compatibility

## [0.2.2] - 2025-07-23

### Added

- Command: Search in Package and Workspace Dependencies... - Select a package and open VS Code search with the package and its workspace dependencies pre-filled

### Changed

- Refactored workspace dependencies architecture for better code reusability

### Fixed

- Fixed workspace root path calculation to ensure proper relative paths for search functionality

## [0.2.1] - 2025-07-23

### Added

- Command: Copy Workspace Dependency Names Of... - Select a package and copy its workspace dependency names to clipboard
- Command: Copy Workspace Dependency Paths Of... - Select a package and copy its workspace dependency paths to clipboard

### Changed

- Command: Copy Workspace Dependencies Of... - Now renamed to Copy Workspace Dependency Paths Of...
- Workspace package sorting - Scoped packages (@-prefixed) now come after regular packages

## [0.2.0] - 2025-07-23

### Added

- Initial release of pnpm Workspace extension
- Command: Copy Workspace Dependencies Of... - Select a package and copy its workspace dependencies to clipboard
- Command: Re-scan Workspace Packages - Refresh the package cache when workspace changes
- Configuration options to include/exclude different dependency types:
  - Production dependencies (`pnpmWorkspace.copyWorkspaceDependencies.includeDependencies`)
  - Development dependencies (`pnpmWorkspace.copyWorkspaceDependencies.includeDevDependencies`)
  - Optional dependencies (`pnpmWorkspace.copyWorkspaceDependencies.includeOptionalDependencies`)
- Web extension support for VS Code for Web and remote development
- Automatic workspace scanning with caching for performance
- Detailed logging for debugging workspace discovery
- Workspace package sorting - Workspace root always comes first
- Immediate loading states for better user experience
- Progress notifications for long-running operations
