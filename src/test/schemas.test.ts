import * as assert from 'assert';
import { DependencyNameSchema, DependencyVersionSchema, PackageJsonSchema, WorkspaceConfigSchema } from '../schemas.js';

suite('Schemas Test Suite', () => {
  suite('WorkspaceConfigSchema', () => {
    test('should validate valid workspace config', () => {
      const validConfig = {
        packages: ['packages/*', 'apps/*'],
      };

      const result = WorkspaceConfigSchema.parse(validConfig);
      assert.deepStrictEqual(result, validConfig);
    });

    test('should provide default empty packages array', () => {
      const emptyConfig = {};

      const result = WorkspaceConfigSchema.parse(emptyConfig);
      assert.deepStrictEqual(result, { packages: [] });
    });

    test('should reject invalid packages array', () => {
      const invalidConfig = {
        packages: 'not-an-array',
      };

      assert.throws(() => {
        WorkspaceConfigSchema.parse(invalidConfig);
      });
    });
  });

  suite('PackageJsonSchema', () => {
    test('should validate minimal package.json', () => {
      const minimalPackage = {
        name: 'test-package',
      };

      const result = PackageJsonSchema.parse(minimalPackage);
      assert.strictEqual(result.name, 'test-package');
    });

    test('should validate package.json with dependencies', () => {
      const packageWithDeps = {
        name: 'test-package',
        dependencies: {
          react: '^18.0.0',
          '@workspace/utils': 'workspace:*',
        },
        devDependencies: {
          '@types/node': '^20.0.0',
        },
        optionalDependencies: {
          'optional-pkg': '1.0.0',
        },
      };

      const result = PackageJsonSchema.parse(packageWithDeps);
      assert.strictEqual(result.name, 'test-package');
      assert.deepStrictEqual(result.dependencies, packageWithDeps.dependencies);
      assert.deepStrictEqual(result.devDependencies, packageWithDeps.devDependencies);
      assert.deepStrictEqual(result.optionalDependencies, packageWithDeps.optionalDependencies);
    });

    test('should reject package.json without name', () => {
      const packageWithoutName = {
        dependencies: { react: '^18.0.0' },
      };

      assert.throws(() => {
        PackageJsonSchema.parse(packageWithoutName);
      });
    });

    test('should reject package.json with empty name', () => {
      const packageWithEmptyName = {
        name: '',
      };

      assert.throws(() => {
        PackageJsonSchema.parse(packageWithEmptyName);
      });
    });
  });

  suite('DependencySchemas', () => {
    test('DependencyNameSchema should accept valid names', () => {
      assert.strictEqual(DependencyNameSchema.parse('react'), 'react');
      assert.strictEqual(DependencyNameSchema.parse('@types/node'), '@types/node');
      assert.strictEqual(DependencyNameSchema.parse('@workspace/utils'), '@workspace/utils');
    });

    test('DependencyNameSchema should reject empty names', () => {
      assert.throws(() => {
        DependencyNameSchema.parse('');
      });
    });

    test('DependencyVersionSchema should accept valid versions', () => {
      assert.strictEqual(DependencyVersionSchema.parse('^18.0.0'), '^18.0.0');
      assert.strictEqual(DependencyVersionSchema.parse('workspace:*'), 'workspace:*');
      assert.strictEqual(DependencyVersionSchema.parse('1.0.0'), '1.0.0');
    });

    test('DependencyVersionSchema should reject empty versions', () => {
      assert.throws(() => {
        DependencyVersionSchema.parse('');
      });
    });
  });
});
