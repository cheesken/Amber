import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const mobileDir = join(repoRoot, 'apps', 'mobile');

if (existsSync(join(mobileDir, 'package.json'))) {
  console.log('apps/mobile already exists. Nothing to do.');
  process.exit(0);
}

const result = spawnSync(
  'npx',
  ['create-expo-app@latest', 'apps/mobile', '--yes', '--template', 'blank-typescript'],
  {
    stdio: 'inherit',
    shell: false,
  },
);

process.exit(result.status ?? 1);
