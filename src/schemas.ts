import { z } from 'zod';

// Zod schemas for validation
export const WorkspaceConfigSchema = z.object({
  packages: z.array(z.string()).default([]),
});

export const DependencyNameSchema = z.string().min(1, 'Dependency name is required');
export const DependencyVersionSchema = z.string().min(1, 'Dependency version is required');

export const PackageJsonSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  dependencies: z.record(DependencyNameSchema, DependencyVersionSchema).optional(),
  devDependencies: z.record(DependencyNameSchema, DependencyVersionSchema).optional(),
  optionalDependencies: z.record(DependencyNameSchema, DependencyVersionSchema).optional(),
});

// Type exports for convenience
export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
export type PackageJson = z.infer<typeof PackageJsonSchema>;
