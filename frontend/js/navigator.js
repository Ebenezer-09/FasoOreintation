/**
 * Navigation du Parcours d'Orientation
 * Gère le flux: profil → bulletins → analyse → recommandations
 */

const ORIENTATION_FLOW = [
  { page: 'profil.html', title: '1. Votre Profil', icon: 'person' },
  { page: 'bulletins.html', title: '2. Vos Bulletins', icon: 'description' },
  { page: 'analyse.html', title: '3. Analyse', icon: 'analytics' },
  { page: 'recommandations.html', title: '4. Recommandations', icon: 'lightbulb' },
];

/**
 * Obtenir la page actuelle
 */
function getCurrentPage() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

/**
 * Obtenir l'index de la page actuelle dans le flux
 */
function getCurrentStepIndex() {
  const current = getCurrentPage();
  return ORIENTATION_FLOW.findIndex(step => step.page === current);
}

/**
 * Aller à la page suivante du parcours
 */
function nextStep() {
  const currentIndex = getCurrentStepIndex();
  if (currentIndex !== -1 && currentIndex < ORIENTATION_FLOW.length - 1) {
    const nextPage = ORIENTATION_FLOW[currentIndex + 1].page;
    window.location.href = nextPage;
  }
}

/**
 * Aller à la page précédente du parcours
 */
function previousStep() {
  const currentIndex = getCurrentStepIndex();
  if (currentIndex > 0) {
    const prevPage = ORIENTATION_FLOW[currentIndex - 1].page;
    window.location.href = prevPage;
  }
}

/**
 * Ajouter les boutons de navigation au pied de page
 */
function initializeNavigationButtons() {
  const currentIndex = getCurrentStepIndex();
  
  // Ne rien faire si pas dans le flux
  if (currentIndex === -1) return;

  // Créer la barre de navigation
  const navBar = document.createElement('div');
  navBar.className = 'fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-700 z-40';
  navBar.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium text-slate-600 dark:text-slate-300">
          ${ORIENTATION_FLOW[currentIndex].title}
        </span>
        <div class="flex gap-1">
          ${ORIENTATION_FLOW.map((step, idx) => `
            <div class="h-1 w-12 rounded-full ${idx <= currentIndex ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}"></div>
          `).join('')}
        </div>
      </div>
      <div class="flex gap-3">
        ${currentIndex > 0 ? `<button onclick="previousStep()" class="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">← Précédent</button>` : ''}
        ${currentIndex < ORIENTATION_FLOW.length - 1 ? `<button onclick="nextStep()" class="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">Suivant →</button>` : `<a href="index.html" class="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-center">Terminer</a>`}
      </div>
    </div>
  `;
  
  document.body.appendChild(navBar);
  
  // Ajouter du padding au body pour éviter que le contenu soit caché
  document.body.style.paddingBottom = '80px';
}

// Initialiser quand le DOM est prêt
document.addEventListener('DOMContentLoaded', initializeNavigationButtons);
