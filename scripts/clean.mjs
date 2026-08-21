// Removes installed dependencies and build artifacts from the workspace.
// Replaces the previous rimraf-based script (rimraf was not a dependency).
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const ARTIFACTS = ['node_modules', '.next', 'dist', '.turbo']

for (const name of ARTIFACTS) {
  rmSync(name, { recursive: true, force: true })
}

for (const group of ['apps', 'packages']) {
  if (!existsSync(group)) continue
  for (const entry of readdirSync(group, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    for (const name of ARTIFACTS) {
      rmSync(join(group, entry.name, name), { recursive: true, force: true })
    }
  }
}

console.log('Workspace cleaned.')
