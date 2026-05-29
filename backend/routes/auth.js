/**
 * Routes d'authentification
 * Endpoints: POST /api/auth/signup, POST /api/auth/login, POST /api/auth/logout
 */

const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  initSupabase,
  initSupabaseAuth,
} = require('../supabase-client');

// ============================================================================
// Validation des emails
// ============================================================================

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone) => {
  // Format: +226 (Burkina Faso) ou format numérique
  const phoneRegex = /^(\+?226)?[0-9]{8,}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

// ============================================================================
// POST /api/auth/signup - Inscription
// ============================================================================

router.post('/signup', async (req, res) => {
  try {
    const { email, phone, firstName, lastName, password, passwordConfirmation } = req.body;

    // Validation des champs requis
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, mot de passe, prénom et nom sont requis',
      });
    }

    // Validation du format email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email invalide',
      });
    }

    // Validation de la longueur du mot de passe
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit faire au moins 6 caractères',
      });
    }

    // Vérifier que les mots de passe correspondent
    if (password !== passwordConfirmation) {
      return res.status(400).json({
        success: false,
        message: 'Les mots de passe ne correspondent pas',
      });
    }

    // Vérifier que l'email n'existe pas déjà
    const sb = initSupabase();
    const { data: existingUser } = await sb
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé',
      });
    }

    // Enregistrer l'utilisateur
    const user = await registerUser(email, password, firstName, lastName, phone);

    return res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      user: {
        id: user.user.id,
        email: user.user.email,
        first_name: user.user.user_metadata?.first_name,
        last_name: user.user.user_metadata?.last_name,
      },
    });
  } catch (error) {
    console.error('Erreur inscription:', error);

    // Gestion des erreurs spécifiques
    if (error.message.includes('duplicate key')) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'inscription',
    });
  }
});

// ============================================================================
// POST /api/auth/login - Connexion
// ============================================================================

router.post('/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    // Validation des champs requis
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Téléphone et mot de passe sont requis',
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email ou téléphone requis',
      });
    }

    let identifier = email;

    // Si c'est un téléphone, chercher l'email correspondant
    if (!email && phone) {
      const sb = initSupabase();
      const cleanPhone = phone.trim().replace(/\s/g, '');
      const { data: userData, error: userError } = await sb
        .from('users')
        .select('email')
        .ilike('phone', `%${cleanPhone}%`)
        .limit(1)
        .single();

      if (userError || !userData) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect',
        });
      }

      identifier = userData.email;
    }

    // Connecter l'utilisateur
    const loginResult = await loginUser(identifier, password);
    const session = loginResult.session;

    // Récupérer les infos utilisateur
    const sb = initSupabase();
    const { data: userData, error: userError } = await sb
      .from('users')
      .select('id, email, phone, first_name, last_name')
      .eq('email', identifier)
      .single();

    if (userError) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
    }

    // Mettre à jour last_login
    await sb
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userData.id);

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      user: {
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
        first_name: userData.first_name,
        last_name: userData.last_name,
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
      },
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(401).json({
      success: false,
      message: 'Email ou mot de passe incorrect',
    });
  }
});

// ============================================================================
// POST /api/auth/refresh - Rafraîchir la session Supabase
// ============================================================================

router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token non fourni',
      });
    }

    const sb = initSupabaseAuth();
    const { data, error } = await sb.auth.refreshSession({ refresh_token });

    if (error || !data.session) {
      return res.status(401).json({
        success: false,
        message: 'Session expirée, veuillez vous reconnecter',
      });
    }

    return res.status(200).json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
      },
    });
  } catch (error) {
    console.error('Erreur refresh session:', error);
    return res.status(401).json({
      success: false,
      message: 'Session expirée, veuillez vous reconnecter',
    });
  }
});

// ============================================================================
// POST /api/auth/logout - Déconnexion
// ============================================================================

router.post('/logout', async (req, res) => {
  try {
    // Dans Supabase, logout se fait côté client
    // Ce endpoint peut servir à nettoyer les sessions côté serveur si besoin

    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie',
    });
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion',
    });
  }
});

// ============================================================================
// GET /api/auth/verify - Vérifier le token JWT
// ============================================================================

router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token non fourni',
      });
    }

    // Vérifier le token avec Supabase
    const sb = initSupabase();
    const { data: userData, error } = await sb.auth.getUser(token);

    if (error || !userData.user) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou expiré',
      });
    }

    return res.status(200).json({
      success: true,
      user: userData.user,
    });
  } catch (error) {
    console.error('Erreur vérification token:', error);
    res.status(401).json({
      success: false,
      message: 'Token invalide',
    });
  }
});

module.exports = router;
