# 🔐 API d'Authentification - FasoOrientation

## Architecture

```
Frontend                    Backend                    Supabase
┌─────────────┐           ┌──────────────┐           ┌─────────┐
│ HTML Forms  │──POST────→│ /api/auth/   │──────────→│  Auth + │
│             │           │  signup      │           │    DB   │
│             │           │  login       │           │         │
│             │←─Response─│              │←─Response─│         │
└─────────────┘           └──────────────┘           └─────────┘
```

## Endpoints

### 1️⃣ POST `/api/auth/signup` - Inscription

**Requête:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jean@example.com",
    "phone": "+226 01 02 03 04",
    "firstName": "Jean",
    "lastName": "Dupont",
    "password": "SecurePassword123",
    "passwordConfirmation": "SecurePassword123"
  }'
```

**Réponse Succès (201):**
```json
{
  "success": true,
  "message": "Inscription réussie",
  "user": {
    "id": "uuid-here",
    "email": "jean@example.com",
    "first_name": "Jean",
    "last_name": "Dupont"
  }
}
```

**Réponse Erreur (400/409):**
```json
{
  "success": false,
  "message": "Cet email est déjà utilisé"
}
```

**Validations:**
- Email requis et format valide
- Mot de passe ≥ 6 caractères
- Mots de passe correspondent
- Email unique

---

### 2️⃣ POST `/api/auth/login` - Connexion

**Requête (avec email):**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jean@example.com",
    "password": "SecurePassword123"
  }'
```

**Requête (avec téléphone):**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "01 02 03 04",
    "password": "SecurePassword123"
  }'
```

**Réponse Succès (200):**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "user": {
    "id": "uuid-here",
    "email": "jean@example.com",
    "phone": "+226 01 02 03 04",
    "first_name": "Jean",
    "last_name": "Dupont"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "some-token",
    "expires_in": 3600
  }
}
```

**Réponse Erreur (401):**
```json
{
  "success": false,
  "message": "Email ou mot de passe incorrect"
}
```

---

### 3️⃣ POST `/api/auth/logout` - Déconnexion

**Requête:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer TOKEN_HERE"
```

**Réponse Succès (200):**
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

---

### 4️⃣ GET `/api/auth/verify` - Vérifier le Token

**Requête:**
```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Réponse Succès (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "jean@example.com",
    "email_confirmed_at": "...",
    "phone": "...",
    "last_sign_in_at": "..."
  }
}
```

**Réponse Erreur (401):**
```json
{
  "success": false,
  "message": "Token invalide ou expiré"
}
```

---

## Intégration Frontend

### JavaScript - Exemple d'Inscription

```javascript
// frontend/js/auth-api.js

class AuthAPI {
  constructor(baseUrl = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  async signup(data) {
    const response = await fetch(`${this.baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async login(data) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    
    if (result.success && result.session) {
      // Sauvegarder le token
      localStorage.setItem('auth_token', result.session.access_token);
      localStorage.setItem('user_data', JSON.stringify(result.user));
    }
    
    return result;
  }

  async logout() {
    const response = await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    
    return response.json();
  }

  async verifyToken() {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    const response = await fetch(`${this.baseUrl}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.json();
  }
}

// Utilisation
const auth = new AuthAPI();

// Inscription
document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const result = await auth.signup({
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    password: document.getElementById('password').value,
    passwordConfirmation: document.getElementById('passwordConfirmation').value,
  });

  if (result.success) {
    alert('Inscription réussie! Veuillez vous connecter.');
    window.location.href = '/connexion.html';
  } else {
    alert('Erreur: ' + result.message);
  }
});

// Connexion
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const result = await auth.login({
    email: document.getElementById('email').value || undefined,
    phone: document.getElementById('phone').value || undefined,
    password: document.getElementById('password').value,
  });

  if (result.success) {
    alert('Connexion réussie!');
    window.location.href = '/index.html';
  } else {
    alert('Erreur: ' + result.message);
  }
});
```

---

## Codes Erreurs

| Code | Message | Cause |
|------|---------|-------|
| 400 | Email/téléphone et mot de passe requis | Champs manquants |
| 400 | Format email invalide | Email mal formé |
| 400 | Le mot de passe doit faire au moins 6 caractères | Pwd trop court |
| 400 | Les mots de passe ne correspondent pas | Confirmation différente |
| 409 | Cet email est déjà utilisé | Compte existant |
| 401 | Email ou mot de passe incorrect | Identifiants invalides |
| 401 | Token invalide ou expiré | Token expiré |
| 500 | Erreur lors de l'inscription | Erreur serveur |

---

## Prochaines Étapes

- ✅ API d'authentification créée
- ✅ Validations côté serveur
- ⏳ Mettre à jour les formulaires HTML pour utiliser les APIs
- ⏳ Créer les endpoints pour profils
- ⏳ Créer les endpoints pour bulletins scolaires
- ⏳ Créer les endpoints pour recommandations
