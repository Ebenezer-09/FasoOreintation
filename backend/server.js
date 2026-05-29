#!/usr/bin/env node
/**
 * FasoOrientation Backend Server
 * Serveur Express simple pour servir l'application frontend statique
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Pointer vers le dossier frontend
const frontendPath = path.join(__dirname, '../frontend');

// ============================================================================
// MIDDLEWARES
// ============================================================================

// CORS
const corsOptions = {
  origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Logger des requêtes (développement)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============================================================================
// ROUTES API
// ============================================================================

const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const scholarshipRoutes = require('./routes/scholarships');
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/scholarships', scholarshipRoutes);

// Scheduler bourses (scraping toutes les 10 min)
const { startScholarshipScheduler } = require('./scraper/scholarship_scheduler');

// ============================================================================
// FICHIERS STATIQUES
// ============================================================================

// Middleware pour les fichiers statiques (sauf index.html)
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    return next();
  }
  express.static(frontendPath)(req, res, next);
});

function getPublicEnv() {
  return {
    API_BASE_URL: process.env.PUBLIC_API_BASE_URL || '/api',
    GROQ_CHAT_MODEL: process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile',
    GROQ_RECOMMENDATION_MODEL: process.env.GROQ_RECOMMENDATION_MODEL || process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile',
    GROQ_EXTRACTION_MODEL: process.env.GROQ_EXTRACTION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
  };
}

function sendHtmlWithEnv(res, fileName) {
  const htmlPath = path.join(frontendPath, fileName);

  if (!htmlPath.startsWith(frontendPath) || !fs.existsSync(htmlPath)) {
    return res.status(404).send('Page introuvable');
  }

  let htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const envScript = `<script>window.FASO_ENV = Object.assign(window.FASO_ENV || {}, ${JSON.stringify(getPublicEnv())});</script>`;
  htmlContent = htmlContent.replace('</head>', `${envScript}\n</head>`);

  return res.send(htmlContent);
}

// Injecter uniquement les variables publiques dans le HTML.
app.get('/', (req, res) => sendHtmlWithEnv(res, 'index.html'));

// Route pour les autres fichiers HTML
app.get('/:file.html', (req, res) => {
  sendHtmlWithEnv(res, `${req.params.file}.html`);
});

// Serve les fichiers statiques (CSS, JS, assets)
app.use(express.static(frontendPath));

// Serve index.html pour les routes non trouvées (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).send('Erreur serveur');
});

if (require.main === module) {
  const server = app.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          🎓  FasoOrientation - Serveur démarré             ║
║                                                            ║
║  🌍  URL: http://${HOST}:${PORT}${' '.repeat(Math.max(0, 17 - HOST.length - PORT.toString().length))}  ║
║                                                            ║
║  💡  Appuyez sur Ctrl+C pour arrêter le serveur            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

    // Démarrage du scheduler de bourses (immédiat puis toutes les 10 min)
    startScholarshipScheduler();
  });

  // Gestion de l'arrêt gracieux
  process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    server.close(() => {
      console.log('✅ Serveur arrêté');
      process.exit(0);
    });
  });
}

module.exports = app;
