/**
 * Einmalig: Storage-Upload-Policy für den products-Bucket anlegen
 * Ausführen: node scripts/setup-storage-policy.mjs DEIN_SERVICE_ROLE_KEY
 */
const SERVICE_ROLE_KEY = process.argv[2];
if (!SERVICE_ROLE_KEY) { console.error('Service Role Key fehlt'); process.exit(1); }

const SUPABASE_URL = 'https://rxlfmxwywnecvsxsidol.supabase.co';

// SQL über Supabase REST ausführen (service_role hat vollen Zugriff)
const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  }
});

// Direkter SQL-Aufruf via postgres endpoint
const sql = `
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'anon_insert_products'
    ) THEN
      CREATE POLICY anon_insert_products ON storage.objects
        FOR INSERT TO anon
        WITH CHECK (bucket_id = 'products');
      RAISE NOTICE 'Policy erstellt';
    ELSE
      RAISE NOTICE 'Policy existiert bereits';
    END IF;
  END $$;
`;

const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ sql })
});

if (r.ok) {
  console.log('✅ Storage-Policy gesetzt');
} else {
  const body = await r.text();
  // Fallback: SQL direkt über postgres connection
  console.log('RPC nicht verfügbar — bitte dieses SQL einmalig im Supabase SQL-Editor ausführen:');
  console.log('\n────────────────────────────────────────────────────────────────');
  console.log('CREATE POLICY anon_insert_products ON storage.objects');
  console.log('  FOR INSERT TO anon');
  console.log("  WITH CHECK (bucket_id = 'products');");
  console.log('────────────────────────────────────────────────────────────────\n');
  console.log('Supabase Dashboard → SQL Editor → Neues Query → einfügen → Run');
}
