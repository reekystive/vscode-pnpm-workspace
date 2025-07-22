# Change Log

All notable changes to the pnpm Workspace Dependencies extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Initial release of pnpm Workspace extension
- Command: Copy Workspace Dependencies of... - Select a package and copy its workspace dependencies to clipboard
- Command: Re-scan Workspace Packages - Refresh the package cache when workspace changes
- Configuration options to include/exclude different dependency types:
  - Production dependencies (`pnpmWorkspace.copyWorkspaceDependencies.includeDependencies`)
  - Development dependencies (`pnpmWorkspace.copyWorkspaceDependencies.includeDevDependencies`)
  - Optional dependencies (`pnpmWorkspace.copyWorkspaceDependencies.includeOptionalDependencies`)
- Web extension support for VS Code for Web and remote development
- Automatic workspace scanning with caching for performance
- Detailed logging for debugging workspace discovery
