// FasoOrientation - Script principal

document.addEventListener('DOMContentLoaded', function() {
  console.log('FasoOrientation frontend chargé');
  
  // Initialiser les event listeners
  initializeButtons();
  initializeNavigation();
  initializeTheme();
});

// Initialiser les boutons
function initializeButtons() {
  const startBtn = document.querySelector('button:contains("Commencer mon orientation")');
  const discoverBtn = document.querySelector('button:contains("Découvrir les filières")');
  
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      console.log('Redirection vers le formulaire d\'orientation');
      // À implémenter: redirection vers la page d'orientation
    });
  }
  
  if (discoverBtn) {
    discoverBtn.addEventListener('click', function() {
      console.log('Redirection vers les filières');
      // À implémenter: redirection vers la page des filières
    });
  }
}

// Initialiser la navigation
function initializeNavigation() {
  const navLinks = document.querySelectorAll('.nav-link, a[href="#"]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      
      if (href === '#') {
        e.preventDefault();
      }
      
      // À implémenter: gestion de la navigation
    });
  });
}

// Gestion du mode sombre/clair
function initializeTheme() {
  const html = document.documentElement;
  const isDarkMode = localStorage.getItem('darkMode');
  
  // Déterminer le mode initialement (préférence système)
  if (isDarkMode === null) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    localStorage.setItem('darkMode', prefersDark ? 'true' : 'false');
  }
  
  applyTheme(localStorage.getItem('darkMode') === 'true');
}

function applyTheme(isDark) {
  const html = document.documentElement;
  if (isDark) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

// Fonction utilitaire pour les requêtes API
async function apiCall(endpoint, options = {}) {
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Exporter les fonctions pour utilisation dans d'autres fichiers
window.FasoOrientation = {
  apiCall,
  applyTheme,
};
