<!-- markdownlint-disable MD036 -->

# Contributing to pnpm Workspace 🤝

Thank you for your interest in contributing to pnpm Workspace! This document provides guidelines and information for contributors.

This extension supports all VS Code environments:

- Local
- Remote (SSH/WSL/Dev Containers)
- Web (github.dev, vscode.dev)

## Development Setup 🛠️

This extension is built with:

- TypeScript
- VS Code Extension API
- ESBuild for bundling
- pnpm for package management

### Prerequisites

- Node.js >= 22.15.0
- pnpm 10.13.1+
- VS Code

### Recommended Extensions

Install these recommended VS Code extensions for the best development experience:

- `amodio.tsl-problem-matcher` - TypeScript problem matcher
- `ms-vscode.extension-test-runner` - Extension Test Runner
- `dbaeumer.vscode-eslint` - ESLint integration

### Building from Source

```bash
# Clone the repository
git clone https://github.com/reekystive/vscode-pnpm-workspace.git
cd vscode-pnpm-workspace

# Install dependencies
pnpm install

# Compile the extension
pnpm run compile

# Package the extension
pnpm run package
```

### Development Commands

| Command                  | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| `pnpm run compile`       | Compile the extension with type checking and linting |
| `pnpm run watch`         | Watch for changes and recompile automatically        |
| `pnpm run watch:esbuild` | Watch for changes and rebuild with ESBuild           |
| `pnpm run watch:tsc`     | Watch for TypeScript changes                         |
| `pnpm run check-types`   | Run TypeScript type checking                         |
| `pnpm run lint`          | Run ESLint                                           |
| `pnpm run test`          | Run tests                                            |
| `pnpm run package`       | Create production build                              |

### Running Tests

```bash
# Run all tests
pnpm run test

# Compile tests only
pnpm run compile-tests

# Watch tests
pnpm run watch-tests
```

### Development Workflow

1. **Fork and Clone**: Fork the repository and clone your fork
2. **Install Dependencies**: Run `pnpm install`
3. **Create Branch**: Create a feature branch from `main`
4. **Develop**: Make your changes
5. **Test**: Run `pnpm run test` to ensure tests pass
6. **Lint**: Run `pnpm run lint` to check code style
7. **Build**: Run `pnpm run package` to create production build
8. **Commit**: Make descriptive commits
9. **Push**: Push to your fork
10. **PR**: Create a Pull Request

### Testing Your Changes

#### Development Debugging

1. Press `F5` in VS Code to launch a new Extension Development Host window
2. In the new window, open a project with package.json files
3. Test the extension commands through the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac)
4. Set breakpoints in your code inside `src/extension.ts` to debug your extension
5. Find output from your extension in the debug console
6. You can relaunch the extension from the debug toolbar after changing code
7. You can also reload (`Ctrl+R` or `Cmd+R` on Mac) the VS Code window to load your changes

#### Running Automated Tests

- Install the [Extension Test Runner](https://marketplace.visualstudio.com/items?itemName=ms-vscode.extension-test-runner)
- Run the "watch" task via the **Tasks: Run Task** command. Make sure this is running, or tests might not be discovered
- Open the Testing view from the activity bar and click the "Run Test" button, or use the hotkey `Ctrl/Cmd + ; A`
- See the output of the test result in the Test Results view
- Make changes to `src/test/extension.test.ts` or create new test files inside the `test` folder
- The provided test runner will only consider files matching the name pattern `**.test.ts`
- You can create folders inside the `test` folder to structure your tests any way you want

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write descriptive commit messages
- Include tests for new features
- Update documentation as needed

### Project Structure

```plaintext
├── src/
│   ├── extension.ts                   # Main extension entry point
│   ├── logger.ts                     # Logging functionality
│   ├── commands.ts                   # Command implementations
│   ├── pnpm-workspace.ts             # pnpm workspace functionality
│   ├── package-scanner.ts            # Package discovery logic
│   ├── workspace-discovery.ts        # Workspace file discovery
│   ├── virtual-workspace-workaround.ts # Virtual workspace compatibility layer
│   └── test/                         # Test files
│       └── fixtures/                 # Test fixture workspaces
│           └── simple-workspace/     # Basic pnpm workspace for testing
├── dist/                             # Compiled extension bundles
├── out/                              # TypeScript output
├── package.json                      # Extension manifest
├── tsconfig.json                     # TypeScript configuration
├── esbuild.mjs                       # ESBuild configuration (dual build)
└── eslint.config.mjs                 # ESLint configuration
```

### Architecture & Cross-Platform Support

The extension is designed with modularity and cross-platform compatibility in mind:

- **Modular Architecture**: Code is split into focused modules for maintainability
- **VS Code API Only**: Uses only VS Code APIs, no Node.js dependencies for file operations
- **Virtual Workspace Support**: Compatible with virtual file systems and remote workspaces
- **Dual Build System**: Generates both Node.js and Web bundles from the same source
- **URI-based Operations**: All file operations use VS Code URIs for cross-platform compatibility

#### Known Issues & Workarounds

**Virtual Workspace File Discovery Issue**

Due to [VSCode issue #249197](https://github.com/microsoft/vscode/issues/249197), `vscode.workspace.findFiles` doesn't work properly in virtual workspaces (vscode-test-web, GitHub Codespaces, etc.).

**Impact**: Complex glob patterns like `{packages/*/package.json,scripts/*/package.json}` return 0 results even when files exist.

**Our Solution**:

- The extension implements a dual-strategy approach:
  1. **Primary**: Use `findFiles` API for regular file system workspaces (fast and efficient)
  2. **Fallback**: Use manual directory traversal with `fs.readDirectory` and `fs.stat` APIs for virtual workspaces
- Detection is automatic based on URI scheme (`file://` vs others)
- See `src/package-scanner.ts` and `src/workspace-discovery.ts` for implementation details

**Testing Virtual Workspaces**:

```bash
# Test in browser environment
npm run open-in-browser

# Or use vscode-test-web directly
npx vscode-test-web --extensionDevelopmentPath=.
```

### Key Functions

- `scanWorkspacePackages()` in `pnpm-workspace.ts`: Discovers all packages in pnpm workspace
- `getWorkspaceDependencies()` in `pnpm-workspace.ts`: Extracts workspace dependencies for a package
- `getWorkspacePackages()` in `pnpm-workspace.ts`: Gets cached workspace packages
- `registerCommands()` in `commands.ts`: Registers all extension commands

### Release & Versioning Strategy

This project uses a specific versioning strategy aligned with VS Code extension conventions:

#### Version Rules

- **Stable Releases**: Use even minor versions (e.g., 0.4.0, 0.6.0, 1.0.0)
- **Pre-releases**: Use odd minor versions (e.g., 0.5.123)

#### Automated Versioning

The CI/CD pipeline automatically handles versioning:

1. **Development Builds** (non-tag pushes):
   - Validates that `package.json` minor version is even
   - Generates version: `{major}.{minor+1}.{ci_run_number}`
   - Example: `0.4.0` → `0.5.123`
   - Published as pre-release

2. **Release Builds** (tag pushes):
   - Uses exact version from `package.json`
   - Must be even minor version
   - Published as stable release

#### Release Process

1. **Development**: Keep `package.json` at even minor version (e.g., `0.4.0`)
2. **Release**: Update `package.json` to next even minor version (e.g., `0.6.0`) and create git tag → triggers release with version from `package.json`

This ensures clear separation between development previews and stable releases while adhering to VS Code's versioning constraints.

### Submitting Changes

1. Ensure all tests pass
2. Update documentation if needed
3. Follow the existing code style
4. Write clear commit messages
5. Submit a Pull Request with a detailed description

### Reporting Issues

When reporting issues, please include:

- VS Code version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Any error messages

### Getting Help

- Check existing issues and discussions
- Review the VS Code Extension API documentation
- Open the full set of VS Code API by viewing `node_modules/@types/vscode/index.d.ts`
- Ask questions in the issue tracker

### Additional Resources

- [Bundle your extension](https://code.visualstudio.com/api/working-with-extensions/bundling-extension) to reduce size and improve startup time
- [Publish your extension](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) on the VS Code marketplace
- [Set up Continuous Integration](https://code.visualstudio.com/api/working-with-extensions/continuous-integration) for automated builds

Thank you for contributing! 🎉
