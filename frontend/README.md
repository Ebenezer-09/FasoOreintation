# FasoOrientation Frontend

Frontend pour la plateforme d'orientation universitaire FasoOrientation au Burkina Faso.

## Structure du projet

```
frontend/
├── index.html          # Page d'accueil principale
├── css/               # Feuilles de style personnalisées
├── js/                # Scripts JavaScript
├── assets/            # Images, icônes et autres ressources
└── README.md          # Ce fichier
```

## Technologies utilisées

- **HTML5** - Structure sémantique
- **Tailwind CSS** - Framework CSS utilitaire (via CDN)
- **Material Symbols** - Icônes (via CDN)
- **Google Fonts** - Polices Lexend (via CDN)
- **JavaScript** - Interactivité (optionnel)

## Démarrage

1. Ouvrez `index.html` dans votre navigateur
2. Le site est responsive et fonctionne sur mobile et desktop
3. Mode sombre/clair automatique selon les préférences système

## Couleurs personnalisées

- **Primaire**: `#1e804f` (Vert)
- **Secondaire**: `#fbbf24` (Jaune)
- **Fond clair**: `#f6f8f7`
- **Fond sombre**: `#131f19`

## Sections disponibles

- ✅ Barre de navigation (sticky)
- ✅ Section héros avec appels à l'action
- ✅ Section features (3 colonnes)
- ✅ Barre de navigation mobile (sticky bottom)

## Prochaines étapes

- [ ] Implémenter la page des filières universitaires
- [ ] Créer le système d'orientation (quiz)
- [ ] Ajouter une page de détail pour chaque filière
- [ ] Intégrer avec le backend API
- [ ] Ajouter la gestion des favoris
- [ ] Implémenter l'authentification utilisateur


cd /home/bakouan/Bureau/PROJET/FasoInnovation/frontend && python3 -m http.server 8000