import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';
import { optimize as optimizeSvg } from 'svgo';

const rootDir = process.cwd();
const targetDir = path.join(rootDir, 'public');
const minBytes = 10 * 1024;
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

const results = {
  scanned: 0,
  optimized: 0,
  skipped: 0,
  bytesBefore: 0,
  bytesAfter: 0,
};

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    yield fullPath;
  }
}

async function optimizeRaster(filePath, extension) {
  const image = sharp(filePath, { animated: false });
  const metadata = await image.metadata();
  const pipeline = image.rotate();

  if (extension === '.png') {
    return pipeline.png({
      compressionLevel: 9,
      palette: metadata.hasAlpha !== true,
      quality: 82,
      effort: 10,
    }).toBuffer();
  }

  if (extension === '.webp') {
    return pipeline.webp({
      quality: 82,
      effort: 6,
      smartSubsample: true,
    }).toBuffer();
  }

  return pipeline.jpeg({
    quality: 82,
    mozjpeg: true,
    progressive: true,
    chromaSubsampling: '4:4:4',
  }).toBuffer();
}

async function optimizeFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (!allowedExtensions.has(extension)) return;

  const stat = await fs.stat(filePath);
  if (stat.size < minBytes) {
    results.skipped += 1;
    return;
  }

  results.scanned += 1;
  results.bytesBefore += stat.size;

  const original = await fs.readFile(filePath);
  let optimized;

  if (extension === '.svg') {
    const result = optimizeSvg(original.toString('utf8'), {
      path: filePath,
      multipass: true,
      plugins: [
        'preset-default',
        'sortAttrs',
      ],
    });
    optimized = Buffer.from(result.data);
  } else {
    optimized = await optimizeRaster(filePath, extension);
  }

  if (!optimized || optimized.length >= original.length) {
    results.bytesAfter += original.length;
    results.skipped += 1;
    return;
  }

  await fs.writeFile(filePath, optimized);
  results.bytesAfter += optimized.length;
  results.optimized += 1;

  const rel = path.relative(rootDir, filePath);
  const saved = original.length - optimized.length;
  console.log(`optimized ${rel} - saved ${saved} bytes`);
}

async function main() {
  for await (const filePath of walk(targetDir)) {
    await optimizeFile(filePath);
  }

  const saved = results.bytesBefore - results.bytesAfter;
  console.log('');
  console.log(`scanned: ${results.scanned}`);
  console.log(`optimized: ${results.optimized}`);
  console.log(`skipped: ${results.skipped}`);
  console.log(`bytes before: ${results.bytesBefore}`);
  console.log(`bytes after: ${results.bytesAfter}`);
  console.log(`bytes saved: ${saved > 0 ? saved : 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
