import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { bucket, checked, clients, images } from './supabase-common.mjs';

async function main() {
  const { admin } = clients();
  const config = checked(await admin.storage.getBucket(bucket), 'Read image bucket');
  if (!config.public || !config.allowed_mime_types?.includes('image/png')) throw new Error('Apply the migrations: product-images must be public and accept image/png.');
  const products = checked(await admin.from('products').select('id,slug').in('id', images.map(image => image.id)), 'Read seeded products');
  if (images.some(image => !products.some(product => product.id === image.id && product.slug === image.slug))) throw new Error('Apply seed.sql first. All six expected product IDs and slugs must exist.');

  for (const image of images) {
    const bytes = await readFile(new URL(`../supabase/product-images/${image.file}.png`, import.meta.url));
    const hash = createHash('sha256').update(bytes).digest('hex');
    const path = `catalogue/${image.slug}-${hash.slice(0, 16)}.png`;
    // Content-addressed names make reruns safe without replacing unrelated files.
    const upload = await admin.storage.from(bucket).upload(path, bytes, { contentType: 'image/png', cacheControl: '31536000', upsert: false });
    if (upload.error && !['409', 'Duplicate'].includes(String(upload.error.statusCode || upload.error.error))) checked(upload, `Upload ${image.slug}`);
    const { data: { publicUrl } } = admin.storage.from(bucket).getPublicUrl(path);
    const response = await fetch(publicUrl, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Public image download failed for ${image.slug} (${response.status}).`);
    const downloaded = Buffer.from(await response.arrayBuffer());
    if (createHash('sha256').update(downloaded).digest('hex') !== hash) throw new Error(`Public image checksum mismatch for ${image.slug}.`);
    const updated = checked(await admin.from('products').update({ imageUrl: publicUrl }).eq('id', image.id).eq('slug', image.slug).select('id'), `Link ${image.slug}`);
    if (updated.length !== 1) throw new Error(`Expected exactly one linked product for ${image.slug}.`);
    console.log(`${image.slug}: ${publicUrl}`);
  }
  console.log('Uploaded and verified six public images; product image URLs updated.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
