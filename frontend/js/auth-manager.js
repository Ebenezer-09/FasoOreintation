/**
 * Vérification et gestion de l'authentification
 */

class AuthManager {
  /**
   * Vérifier si l'utilisateur est connecté
   */
  static isLoggedIn() {
    const token = localStorage.getItem('auth_token');
    const expiresAt = Number(localStorage.getItem('expires_at'));

    if (!token) return false;
    if (!expiresAt) return false;

    return Date.now() < (expiresAt * 1000);
  }

  /**
   * Obtenir les données utilisateur
   */
  static getUserData() {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Rediriger vers connexion si pas connecté
   */
  static checkAuth(redirectUrl = 'connexion.html') {
    if (!this.isLoggedIn()) {
      if (window.authAPI?.clearSession) {
        window.authAPI.clearSession();
      }
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  /**
   * Rediriger vers index si déjà connecté
   */
  static checkNotAuth(redirectUrl = 'index.html') {
    if (this.isLoggedIn()) {
      window.location.href = redirectUrl;
      return true;
    }
    return false;
  }

  /**
   * Afficher le nom de l'utilisateur
   */
  static displayUsername() {
    const user = this.getUserData();
    if (user) {
      const nameElement = document.getElementById('user-name');
      if (nameElement) {
        nameElement.textContent = `${user.first_name} ${user.last_name}`;
      }

      const emailElement = document.getElementById('user-email');
      if (emailElement) {
        emailElement.textContent = user.email;
      }
    }
  }

  /**
   * Ajouter un bouton de déconnexion
   */
  static setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const confirmed = confirm('Êtes-vous sûr de vouloir vous déconnecter?');
        if (confirmed) {
          await authAPI.logout();
          window.location.href = 'connexion.html';
        }
      });
    }
  }

  /**
   * Afficher/masquer les éléments selon l'authentification
   */
  static setupAuthUI() {
    const isLoggedIn = this.isLoggedIn();

    // Éléments à afficher seulement si connecté
    const authElements = document.querySelectorAll('[data-auth-required]');
    authElements.forEach(el => {
      el.style.display = isLoggedIn ? '' : 'none';
    });

    // Éléments à afficher seulement si non connecté
    const noAuthElements = document.querySelectorAll('[data-auth-forbidden]');
    noAuthElements.forEach(el => {
      el.style.display = isLoggedIn ? 'none' : '';
    });

    if (isLoggedIn) {
      this.displayUsername();
      this.setupLogoutButton();
    }
  }
}

window.AuthManager = AuthManager;

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  AuthManager.setupAuthUI();
});
