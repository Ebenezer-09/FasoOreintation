/**
 * Compatibilité avec les anciennes pages.
 * La source de vérité est maintenant le token Supabase géré par auth-manager.js.
 */

(function () {
  const publicPages = ['connexion.html', 'inscription.html', 'index.html'];

  function getCurrentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function isLoggedIn() {
    return window.AuthManager?.isLoggedIn
      ? window.AuthManager.isLoggedIn()
      : !!localStorage.getItem('auth_token');
  }

  function checkAndRedirect() {
    const currentPage = getCurrentPage();
    const isPublic = publicPages.includes(currentPage);
    const isLogged = isLoggedIn();

    if (!isLogged && !isPublic) {
      window.location.href = 'connexion.html';
      return false;
    }

    if (isLogged && (currentPage === 'connexion.html' || currentPage === 'inscription.html')) {
      window.location.href = 'index.html';
      return false;
    }

    return true;
  }

  document.addEventListener('DOMContentLoaded', checkAndRedirect);
})();
