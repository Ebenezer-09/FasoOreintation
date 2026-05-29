# 🎓 FasoOrientation

Plateforme intelligente d'orientation universitaire pour les lycéens au Burkina Faso.

## 📁 Structure du Projet

```
FasoOrientation/
├── frontend/                 # Application web frontend
│   ├── connexion.html       # Page de connexion
│   ├── inscription.html     # Page d'inscription
│   ├── index.html           # Page d'accueil (protégée)
│   ├── profil.html          # Profil utilisateur (parcours)
│   ├── bulletins.html       # Gestion des bulletins (parcours)
│   ├── analyse.html         # Analyse des résultats (parcours)
│   ├── recommandations.html # Recommandations de filières (parcours)
│   ├── bourses.html         # Informations sur les bourses
│   ├── orientations.html    # Orientations universitaires
│   ├── stages_emplois.html  # Stages et offres d'emploi
│   ├── package.json         # Dépendances frontend
│   ├── css/                 # Feuilles de style
│   ├── js/                  # Scripts JavaScript client-side
│   │   ├── auth.js          # Gestion de l'authentification
│   │   ├── auth-forms.js    # Formulaires de connexion/inscription
│   │   ├── navigator.js     # Navigation du parcours d'orientation
│   │   ├── groq.js          # Intégration Groq API
│   │   ├── main.js          # Scripts généraux
│   │   └── storage.js       # Gestion du localStorage
│   └── assets/              # Ressources (données, images)
│
├── backend/                  # Serveur Express
│   ├── server.js            # Serveur principal
│   ├── dev-server.js        # Script de développement
│   ├── package.json         # Dépendances backend
│   ├── .env                 # Variables d'environnement (clés API)
│   ├── .env.example         # Template .env
│   ├── nodemon.json         # Configuration nodemon
│   ├── .gitignore           # Ignore .env en Git
│   └── node_modules/
│
├── package.json             # Scripts root
├── vercel.json             # Configuration de déploiement
└── README.md               # Ce fichier
```

## 🚀 Installation

### Prérequis
- **Node.js** 14+ ([télécharger](https://nodejs.org))
- **npm** (inclus avec Node.js)

### Étape 1 : Installer les dépendances

```bash
# Installer les dépendances du backend
cd backend
npm install

# Dans un autre terminal, aller au frontend
cd frontend
npm install
```

### Étape 2 : Lancer l'application

**Terminal 1 - Backend (serveur Express):**
```bash
cd backend
npm run dev
```

Le serveur démarrera sur `http://localhost:3000` avec hot-reload automatique.

**Terminal 2 - Frontend (optionnel, pour la build):**
```bash
cd frontend
npm run build
```

## 📋 Scripts Disponibles

### Backend
- `npm run dev` - Lance le serveur avec hot-reload (nodemon)
- `npm start` - Lance le serveur en production

### Frontend
- `npm run build` - Crée une version optimisée dans `./public/`
- `npm run lint` - Lance la vérification du code

## 🔐 Système d'Authentification

L'application dispose d'un système d'authentification simple basé sur localStorage :

### Pages Publiques
- `connexion.html` - Formulaire de connexion
- `inscription.html` - Formulaire d'inscription
- `index.html` - Page d'accueil (accessible après connexion)

### Pages Protégées
Les pages suivantes nécessitent une connexion :
- `profil.html`, `bulletins.html`, `analyse.html`, `recommandations.html` (parcours d'orientation)
- `bourses.html`, `orientations.html`, `stages_emplois.html`

### Flux d'Authentification
1. **Nouvel utilisateur** → Inscription → Connexion automatique → Accueil
2. **Utilisateur existant** → Connexion → Accueil
3. **Utilisateur connecté** → Naviguer librement → Déconnexion

### Données Stockées
Les données utilisateur sont sauvegardées dans localStorage :
```javascript
{
  id: timestamp,
  email: "utilisateur@exemple.com",
  name: "Nom Utilisateur",
  phone: "+226 01 02 03 04",
  loginDate: "2026-05-25T..."
}
```

## 🔧 Configuration

Les variables d'environnement (clés API Groq) se trouvent dans `backend/.env` :

```bash
# backend/.env
GROQ_API_KEYS=votre-clé-api-ici
GROQ_CHAT_MODEL=llama-3.3-70b-versatile
GROQ_RECOMMENDATION_MODEL=llama-3.3-70b-versatile
GROQ_EXTRACTION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
PORT=3000
HOST=localhost
```

**Note :** Ne pas commiter le `.env` (ajouté à `.gitignore`). Utiliser `.env.example` comme template.

## 🌍 Déploiement

### Sur Vercel
```bash
vercel
```

### Sur un serveur Node.js
```bash
cd backend
npm install
npm start
```

Le serveur écoutera sur le port défini par `process.env.PORT` (3000 par défaut).

## 📝 Notes
- L'application stocke les données utilisateur dans **localStorage** (navigateur)
- Les données restent privées et locales - aucun envoi à un serveur
- L'IA utilise l'API Groq pour générer les recommandations
- Le serveur Node.js sert uniquement les fichiers statiques et gère le routing SPA

## 🐛 Dépannage

**Erreur "Port 3000 déjà utilisé"**
```bash
# Sur Linux/Mac : trouver le processus
lsof -i :3000
# Puis terminer : kill -9 <PID>

# Sur Windows (PowerShell)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Erreur "Module 'express' not found"**
```bash
npm install
```

## 📧 Support

Pour toute question, consultez la documentation ou contactez l'équipe FasoInnovation.
