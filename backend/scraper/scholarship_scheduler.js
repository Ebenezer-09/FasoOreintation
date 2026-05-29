/**
 * scholarship_scheduler.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lance le scraper Python toutes les 10 minutes, puis injecte les résultats
 * dans Supabase via inject_to_db.js.
 *
 * Démarré automatiquement par server.js au lancement du backend.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRAPER_DIR = __dirname;                                  // backend/scraper/
const SCRAPER_PY = path.join(SCRAPER_DIR, 'scholarship_scraper.py');
const INJECTOR_JS = path.join(SCRAPER_DIR, 'inject_to_db.js');
const JSON_OUT = path.join(SCRAPER_DIR, 'scholarships.json');

const INTERVAL_MS = 10 * 60 * 1000;   // 10 minutes

let isRunning = false;   // verrou : évite deux exécutions simultanées

// ── Helpers ────────────────────────────────────────────────────────────────────
function log(msg) {
    const ts = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    console.log(`[${ts}] 🎓 Scraper | ${msg}`);
}

function runProcess(cmd, args, cwd) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', d => { stdout += d.toString(); });
        proc.stderr.on('data', d => { stderr += d.toString(); });

        proc.on('close', code => {
            if (code === 0) {
                resolve(stdout.trim());
            } else {
                reject(new Error(stderr.trim() || `Process exited with code ${code}`));
            }
        });

        proc.on('error', reject);
    });
}

// ── Cycle complet : scraping → injection ──────────────────────────────────────
async function runScraperCycle() {
    if (isRunning) {
        log('⏭  Cycle précédent encore en cours, passage ignoré.');
        return;
    }

    isRunning = true;
    const cycleStart = Date.now();
    log('▶  Démarrage du cycle de scraping...');

    try {
        // ── 1. Scraping Python ───────────────────────────────────────────────────
        log('🕷  Scraping des plateformes (SaharaBold, FundMyDegree, Scholar Africa)...');
        await runProcess('python3', [SCRAPER_PY], SCRAPER_DIR);
        log('✅  Scraping terminé.');

        // ── 2. Vérification du JSON ──────────────────────────────────────────────
        if (!fs.existsSync(JSON_OUT)) {
            log('⚠️  scholarships.json introuvable après scraping — injection annulée.');
            return;
        }

        const count = JSON.parse(fs.readFileSync(JSON_OUT, 'utf-8')).length;
        log(`📦  ${count} bourses récupérées — injection en cours...`);

        // ── 3. Injection Node.js → Supabase ─────────────────────────────────────
        await runProcess('node', [INJECTOR_JS, JSON_OUT], SCRAPER_DIR);
        const elapsed = Math.round((Date.now() - cycleStart) / 1000);
        log(`🎉  Injection terminée. Cycle complet en ${elapsed}s.`);

    } catch (err) {
        log(`❌  Erreur durant le cycle : ${err.message}`);
    } finally {
        isRunning = false;
    }
}

// ── Point d'entrée ─────────────────────────────────────────────────────────────
/**
 * Démarre le scheduler.
 * - Lance un premier cycle immédiatement au démarrage
 * - Répète toutes les INTERVAL_MS millisecondes
 */
function startScholarshipScheduler() {
    log(`🚀  Scheduler démarré (intervalle : ${INTERVAL_MS / 60000} min)`);

    // Premier lancement immédiat (sans bloquer le démarrage du serveur)
    runScraperCycle();

    // Puis toutes les 10 minutes
    setInterval(runScraperCycle, INTERVAL_MS);
}

module.exports = { startScholarshipScheduler };
