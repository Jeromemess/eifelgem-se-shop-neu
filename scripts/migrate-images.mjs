/**
 * Einmalige Migration: Base64-Bilder aus DB → Supabase Storage
 *
 * Ausführen:
 *   node scripts/migrate-images.mjs DEIN_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rxlfmxwywnecvsxsidol.supabase.co';
const BUCKET = 'products';

const serviceRoleKey = process.argv[2];
if (!serviceRoleKey || serviceRoleKey.length < 20) {
  console.error('❌ Bitte den Service Role Key als Argument übergeben:');
  console.error('   node scripts/migrate-images.mjs eyJhbGci...');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function ensureBucket() {
  const { data: buckets } = await sb.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET);
  if (!exists) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error('Bucket anlegen fehlgeschlagen: ' + error.message);
    console.log('✓ Storage-Bucket "products" angelegt');
  } else {
    console.log('✓ Storage-Bucket "products" existiert bereits');
  }
}

async function migrate() {
  await ensureBucket();

  console.log('\nLade Produkte aus der Datenbank...');
  const { data: products, error } = await sb
    .from('products')
    .select('id, name, image_url');
  if (error) { console.error('Fehler beim Laden:', error); process.exit(1); }
  console.log(`${products.length} Produkte gefunden.\n`);

  let migrated = 0, skipped = 0, failed = 0;

  for (const product of products) {
    const label = `[${product.name}]`;

    if (!product.image_url) {
      console.log(`⚠️  ${label} kein Bild — übersprungen`);
      skipped++;
      continue;
    }

    if (product.image_url.startsWith('http')) {
      console.log(`✓  ${label} bereits URL — übersprungen`);
      skipped++;
      continue;
    }

    // Base64 parsen — entweder "data:image/jpeg;base64,..." oder reiner Base64-String
    let base64Data, mimeType;
    if (product.image_url.startsWith('data:')) {
      const match = product.image_url.match(/^data:([^;]+);base64,(.+)$/s);
      if (!match) {
        console.log(`✗  ${label} unbekanntes Format — übersprungen`);
        failed++;
        continue;
      }
      mimeType = match[1];
      base64Data = match[2];
    } else {
      base64Data = product.image_url;
      mimeType = 'image/jpeg';
    }

    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `product_${product.id}.${ext}`;
    const buffer = Buffer.from(base64Data, 'base64');

    process.stdout.write(`   ${label} ${(buffer.length / 1024).toFixed(0)} KB → ${fileName} ... `);

    const { error: uploadErr } = await sb.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType: mimeType, upsert: true });

    if (uploadErr) {
      console.log(`✗ Upload-Fehler: ${uploadErr.message}`);
      failed++;
      continue;
    }

    const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(fileName);

    const { error: updateErr } = await sb
      .from('products')
      .update({ image_url: publicUrl })
      .eq('id', product.id);

    if (updateErr) {
      console.log(`✗ DB-Update-Fehler: ${updateErr.message}`);
      failed++;
    } else {
      console.log(`✓`);
      migrated++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`✅ Migration abgeschlossen`);
  console.log(`   Migriert:    ${migrated}`);
  console.log(`   Übersprungen:${skipped}`);
  console.log(`   Fehler:      ${failed}`);
  console.log(`\nDie App sollte jetzt unter 1 Sekunde laden.`);
}

migrate().catch(err => {
  console.error('Unerwarteter Fehler:', err);
  process.exit(1);
});
