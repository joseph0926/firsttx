import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function packageExtension() {
  await fs.copyFile(
    path.join(rootDir, 'src/extension/manifest.json'),
    path.join(rootDir, 'dist/manifest.json'),
  );
  await fs.copyFile(
    path.join(rootDir, 'src/extension/devtools.html'),
    path.join(rootDir, 'dist/devtools.html'),
  );
  try {
    await fs.cp(path.join(rootDir, 'src/extension/icons'), path.join(rootDir, 'dist/icons'), {
      recursive: true,
    });
    console.log('✅ Icons copied');
  } catch (e) {
    console.log('⚠️  No icons to copy');
  }

  console.log('✅ Extension packaged successfully!');
  console.log('📦 Ready to load from:', path.join(rootDir, 'dist'));
}

packageExtension().catch(console.error);
