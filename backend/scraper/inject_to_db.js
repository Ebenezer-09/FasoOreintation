/**
 * inject_to_db.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lit le fichier scholarships.json produit par scholarship_scraper.py
 * et injecte les données dans la table Supabase `scholarships`.
 *
 * Utilisation :
 *   node inject_to_db.js [chemin/vers/scholarships.json]
 *
 * Par défaut le fichier attendu est ./scholarships.json dans le dossier courant.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ── Config Supabase ────────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('❌  SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant dans .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: require('ws') },
});

// ── Helpers ────────────────────────────────────────────────────────────────────
/**
 * Tente de convertir une chaîne deadline en date ISO (YYYY-MM-DD).
 * Exemples acceptés : "30 June 2025", "June 30, 2025", "2025-06-30"
 * Retourne null si non parsable.
 */
function parseDeadline(raw) {
    if (!raw) return null;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }
    return null;
}

/**
 * Transforme un objet Scholarship (sorti du scraper) en ligne Supabase.
 */
function toDbRow(item) {
    return {
        name: item.titre,
        provider: item.source,
        website_url: item.lien,
        eligibility_criteria: item.niveau || null,
        target_countries: item.pays ? [item.pays] : null,
        application_deadline: parseDeadline(item.deadline),
        description: item.description || null,
        amount_fcfa: null,
        duration_months: null,
        required_gpa: null,
        contact_email: null,
    };
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
    const jsonPath = process.argv[2]
        ? path.resolve(process.argv[2])
        : path.join(__dirname, 'scholarships.json');

    if (!fs.existsSync(jsonPath)) {
        console.error(`❌  Fichier introuvable : ${jsonPath}`);
        console.error('    Lance d\'abord : python scholarship_scraper.py');
        process.exit(1);
    }

    let rawData;
    try {
        rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
        console.error('❌  Impossible de lire le JSON :', e.message);
        process.exit(1);
    }

    console.log(`\n📦  ${rawData.length} bourses à injecter depuis ${path.basename(jsonPath)}`);
    console.log('═'.repeat(60));

    if (rawData.length === 0) {
        console.log('⚠️  Aucune donnée à injecter.');
        return;
    }

    // Récupérer les URLs déjà en base avec leur ID pour mettre à jour
    const { data: existingData, error: fetchErr } = await supabase.from('scholarships').select('id, website_url');
    if (fetchErr) {
        console.error('❌ Erreur lors de la récupération des doublons :', fetchErr.message);
        process.exit(1);
    }

    // Mapping url -> id
    const urlMap = {};
    existingData.forEach(e => {
        if (e.website_url) urlMap[e.website_url] = e.id;
    });

    // Assigner l'ID si la bourse existe déjà pour la forcer à se mettre à jour
    const rows = rawData.map(r => {
        const dbRow = toDbRow(r);
        if (dbRow.website_url && urlMap[dbRow.website_url]) {
            dbRow.id = urlMap[dbRow.website_url];
        }
        return dbRow;
    });

    console.log(`🚀 ${rows.length} bourses vont être traitées.`);

    // Upsert (mettra à jour via pk - ID - si fourni, sinon insérera)
    const BATCH_SIZE = 50;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        const { data, error } = await supabase
            .from('scholarships')
            .upsert(batch)
            .select('id, name');

        if (error) {
            console.error(`\n❌  Erreur batch ${i / BATCH_SIZE + 1} :`, error.message);
            errors += batch.length;
        } else {
            inserted += data ? data.length : batch.length;
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const total = Math.ceil(rows.length / BATCH_SIZE);
            console.log(`  ✅ Batch ${batchNum}/${total} → ${batch.length} bourses traitées`);
        }
    }

    console.log('═'.repeat(60));
    console.log(`\n🎉  Injection terminée !`);
    console.log(`   Bourses traitées : ${inserted}`);
    if (errors > 0) {
        console.log(`   ⚠️  Erreurs       : ${errors}`);
    }
    console.log('');
}

main().catch(err => {
    console.error('Erreur fatale :', err);
    process.exit(1);
});
