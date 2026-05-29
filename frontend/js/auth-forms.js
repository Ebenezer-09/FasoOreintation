/**
 * Gestion des formulaires de connexion et inscription
 */

document.addEventListener('DOMContentLoaded', () => {
  // Formulaire de connexion
  const loginForm = document.querySelector('form');
  
  // Déterminer si c'est un formulaire de connexion ou inscription
  const isLoginPage = document.title.includes('Connexion');
  
  if (isLoginPage && loginForm) {
    loginForm.id = 'login-form';
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Accepter phone ou email
      const email = document.getElementById('phone')?.value || document.getElementById('email')?.value;
      const password = document.getElementById('password')?.value;
      
      if (!email || !password) {
        alert('Veuillez remplir tous les champs');
        return;
      }

      // Simuler une connexion (en production, faire une requête API)
      const userData = {
        id: Date.now(),
        email: email,
        name: 'Utilisateur ' + email.split('@')[0],
        loginDate: new Date().toISOString(),
      };

      window.AuthManager.login(userData);
      alert('✅ Connexion réussie !');
      window.location.href = 'index.html';
    });
  } 
  else if (!isLoginPage && loginForm) {
    // Formulaire d'inscription
    loginForm.id = 'signup-form';
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const firstname = document.getElementById('firstname')?.value;
      const lastname = document.getElementById('lastname')?.value;
      const phone = document.getElementById('phone')?.value;
      const email = document.getElementById('email')?.value;
      const password = document.getElementById('password')?.value;
      const confirmPassword = document.getElementById('password_confirmation')?.value || document.getElementById('confirm-password')?.value;

      const name = firstname || lastname ? `${firstname || ''} ${lastname || ''}`.trim() : phone;
      
      if (!name || !password || !confirmPassword) {
        alert('Veuillez remplir tous les champs');
        return;
      }

      if (password !== confirmPassword) {
        alert('Les mots de passe ne correspondent pas');
        return;
      }

      // Simuler une inscription (en production, faire une requête API)
      const userData = {
        id: Date.now(),
        email: email || phone,
        name: name,
        phone: phone,
        signupDate: new Date().toISOString(),
      };

      window.AuthManager.login(userData);
      alert('✅ Inscription réussie ! Bienvenue ' + name + ' !');
      window.location.href = 'index.html';
    });
  }

  // Bouton de déconnexion (peut être ajouté partout)
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        window.AuthManager.logout();
      }
    });
  }
});
