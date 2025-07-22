<!-- markdownlint-disable MD024 -->

# Change Log

All notable changes to the pnpm Workspace Dependencies extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
