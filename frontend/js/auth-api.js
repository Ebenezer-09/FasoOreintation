/**
 * FasoOrientation - Client API d'Authentification
 * Gère les requêtes vers le backend
 */

class AuthAPI {
  constructor(baseUrl = window.FASO_ENV?.API_BASE_URL || '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * POST /api/auth/signup - Inscription
   */
  async signup(data) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur inscription:', error);
      return {
        success: false,
        message: 'Erreur réseau. Veuillez réessayer.',
      };
    }
  }

  /**
   * POST /api/auth/login - Connexion
   */
  async login(data) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      // Sauvegarder le token et les données utilisateur
      if (result.success && result.session) {
        // Nettoyer complètement le localStorage de l'utilisateur précédent
        if (window.FoStorage) {
          FoStorage.clearAll();
        }
        
        localStorage.setItem('auth_token', result.session.access_token);
        localStorage.setItem('refresh_token', result.session.refresh_token);
        if (result.session.expires_at) {
          localStorage.setItem('expires_at', String(result.session.expires_at));
        }
        localStorage.setItem('user_data', JSON.stringify(result.user));
        localStorage.setItem('login_time', new Date().toISOString());
      }

      return result;
    } catch (error) {
      console.error('Erreur connexion:', error);
      return {
        success: false,
        message: 'Erreur réseau. Veuillez réessayer.',
      };
    }
  }

  /**
   * POST /api/auth/logout - Déconnexion
   */
  async logout() {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      // Nettoyer le localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('expires_at');
      localStorage.removeItem('user_data');
      localStorage.removeItem('login_time');

      return result;
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      // Nettoyer même en cas d'erreur
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('expires_at');
      localStorage.removeItem('user_data');
      localStorage.removeItem('login_time');

      return {
        success: false,
        message: 'Erreur déconnexion',
      };
    }
  }

  /**
   * GET /api/auth/verify - Vérifier le token
   */
  async verifyToken() {
    try {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        return {
          success: false,
          message: 'Token non trouvé',
        };
      }

      const response = await fetch(`${this.baseUrl}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur vérification token:', error);
      return {
        success: false,
        message: 'Token invalide',
      };
    }
  }

  /**
   * POST /api/auth/refresh - Rafraîchir le token Supabase
   */
  async refreshSession() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        return {
          success: false,
          message: 'Session expirée, veuillez vous reconnecter',
        };
      }

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const result = await response.json();

      if (result.success && result.session) {
        localStorage.setItem('auth_token', result.session.access_token);
        localStorage.setItem('refresh_token', result.session.refresh_token);
        if (result.session.expires_at) {
          localStorage.setItem('expires_at', String(result.session.expires_at));
        }
      } else {
        this.clearSession();
      }

      return result;
    } catch (error) {
      console.error('Erreur refresh session:', error);
      this.clearSession();
      return {
        success: false,
        message: 'Session expirée, veuillez vous reconnecter',
      };
    }
  }

  clearSession() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('user_data');
    localStorage.removeItem('login_time');
  }

  /**
   * Récupérer les données utilisateur stockées
   */
  getUserData() {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Récupérer le token
   */
  getToken() {
    return localStorage.getItem('auth_token');
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isLoggedIn() {
    return !!localStorage.getItem('auth_token');
  }
}

// Exporter une instance unique
const authAPI = new AuthAPI();
window.authAPI = authAPI;
