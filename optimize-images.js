/* ===================================
   图片优化脚本 — 生成 WebP + 响应式多尺寸
   运行：node optimize-images.js
   产出：images/*.webp, images/*-400w.*, images/*-800w.*, images/*-1200w.*
   =================================== */
const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const IMAGES_DIR = path.join(__dirname, 'images');
const FILES = ['1.jpg', '2.jpg', '3.jpg'];

const WIDTHS = [400, 800, 1200];  // 响应式断点
const JPEG_QUALITY = 80;          // JPEG 压缩质量
const WEBP_QUALITY = 78;          // WebP 压缩质量

async function optimize(filename) {
  const inputPath = path.join(IMAGES_DIR, filename);
  const baseName  = path.parse(filename).name;
  const image     = sharp(inputPath);
  const metadata  = await image.metadata();

  console.log(`Processing ${filename} (${(metadata.size / 1024).toFixed(0)}KB, ${metadata.width}x${metadata.height})...`);

  const tasks = [];

  // 1. 生成 WebP 版本（原始尺寸）
  tasks.push(
    image.clone()
      .webp({ quality: WEBP_QUALITY })
      .toFile(path.join(IMAGES_DIR, baseName + '.webp'))
      .then(() => console.log(`  -> ${baseName}.webp`))
  );

  // 2. 生成各尺寸的 JPEG + WebP
  for (const w of WIDTHS) {
    if (w >= metadata.width) continue; // 不放大

    tasks.push(
      image.clone()
        .resize(w, null, { withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toFile(path.join(IMAGES_DIR, `${baseName}-${w}w.jpg`))
        .then(() => console.log(`  -> ${baseName}-${w}w.jpg`))
    );

    tasks.push(
      image.clone()
        .resize(w, null, { withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(path.join(IMAGES_DIR, `${baseName}-${w}w.webp`))
        .then(() => console.log(`  -> ${baseName}-${w}w.webp`))
    );
  }

  // 3. 优化原图 JPEG（覆盖原文件）
  tasks.push(
    image.clone()
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(inputPath + '.tmp')
      .then(() => {
        fs.renameSync(inputPath + '.tmp', inputPath);
        const newSize = fs.statSync(inputPath).size;
        console.log(`  -> ${filename} optimized (${(metadata.size / 1024).toFixed(0)}KB -> ${(newSize / 1024).toFixed(0)}KB, ${((1 - newSize / metadata.size) * 100).toFixed(0)}% saved)`);
      })
  );

  await Promise.all(tasks);
}

(async function() {
  console.log('Image optimization started...\n');
  for (const f of FILES) {
    await optimize(f);
    console.log('');
  }
  console.log('Done!');
})();
