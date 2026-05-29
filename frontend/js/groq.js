// ─── FasoOrientation · Groq LLM Client ─────────────────────────────────────
const FasoEnv = window.FASO_ENV || {};
const API_BASE_URL = FasoEnv.API_BASE_URL || '/api';
const GROQ_MODELS = {
  chat: FasoEnv.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile',
  recommendation: FasoEnv.GROQ_RECOMMENDATION_MODEL || FasoEnv.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile',
  extraction: FasoEnv.GROQ_EXTRACTION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
};

function getGroqModel(task = 'chat') {
  return GROQ_MODELS[task] || GROQ_MODELS.chat;
}

function clearInvalidSessionAndRedirect() {
  if (window.authAPI?.clearSession) {
    window.authAPI.clearSession();
  } else {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('user_data');
    localStorage.removeItem('login_time');
  }

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPage !== 'connexion.html') {
    window.location.href = 'connexion.html?session=expired';
  }
}

/**
 * Appelle l'API Groq et renvoie le texte de la réponse.
 * @param {Array<{role:string,content:string}>} messages  Historique de conversation
 * @param {object}  opts                                   Options optionnelles
 * @param {number}  opts.maxTokens                         Limite de tokens (défaut 1024)
 * @param {number}  opts.temperature                       Température (défaut 0.7)
 * @param {string}  opts.task                              chat | recommendation | extraction
 * @param {string}  opts.model                             Modèle Groq explicite
 * @returns {Promise<string>} Texte de la réponse du LLM
 */
async function groqChat(messages, opts = {}) {
  const model = opts.model || getGroqModel(opts.task || 'chat');

  async function sendRequest() {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      throw new Error('Connexion requise pour utiliser les fonctionnalités IA.');
    }

    return fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages,
        maxTokens: opts.maxTokens || 1024,
        temperature: opts.temperature ?? 0.7,
        task: opts.task || 'chat',
      }),
    });
  }

  let res = await sendRequest();

  if (res.status === 401 && window.authAPI?.refreshSession) {
    const refreshResult = await window.authAPI.refreshSession();
    if (refreshResult.success) {
      res = await sendRequest();
    } else {
      clearInvalidSessionAndRedirect();
      throw new Error(refreshResult.message || 'Session expirée, veuillez vous reconnecter');
    }
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    if (res.status === 401) {
      clearInvalidSessionAndRedirect();
    }
    throw new Error(data.message || `Erreur IA (${res.status})`);
  }

  return data.content;
}

// ─── Prompt système pour le conseiller d'orientation ────────────────────────
function buildSystemPrompt(profil, analyse, filiere) {
  let ctx = `Tu es un conseiller d'orientation scolaire bienveillant et expert du système éducatif au Burkina Faso. Tu parles en français simple, direct et encourageant. Ta mission est de conseiller l'élève en croisant toujours 4 éléments: ses notes réelles, ses préférences, sa série du Bac et le domaine dans lequel il aimerait exercer plus tard.\n\n`;
  ctx += `RÈGLES DE CONSEIL :\n`;
  ctx += `- Ne conseille jamais une filière uniquement parce qu'elle est populaire: justifie le choix avec les notes, la série du Bac, les préférences et le projet professionnel.\n`;
  ctx += `- Quand une matière clé est faible pour le domaine visé, dis-le avec tact et propose un plan de renforcement concret.\n`;
  ctx += `- Quand une matière forte soutient le projet, cite-la explicitement.\n`;
  ctx += `- Privilégie les filières et écoles réellement présentes dans les recommandations ou dans les données fournies; si tu n'es pas sûr d'une école, formule une vérification à faire au lieu d'inventer.\n`;
  ctx += `- Adapte le conseil au Burkina Faso et aux réalités d'études/emploi en Afrique de l'Ouest.\n\n`;

  if (profil) {
    ctx += `PROFIL DE L'ÉLÈVE :\n`;
    ctx += `- Série du Bac : ${profil.bac || 'Non renseigné'}\n`;
    ctx += `- Matières favorites : ${(profil.matieres || []).join(', ') || 'Non renseigné'}\n`;
    ctx += `- Domaine de carrière souhaité / domaine où il aimerait exercer : ${profil.carriere || 'Non renseigné'}\n`;
    ctx += `- Budget annuel : ${profil.budget || 'Non renseigné'}\n`;
    ctx += `- Ville souhaitée : ${profil.ville || 'Non renseigné'}\n\n`;
  }

  if (analyse) {
    ctx += `RÉSULTATS ACADÉMIQUES :\n`;
    if (analyse.notes) {
      Object.entries(analyse.notes).forEach(([mat, note]) => {
        ctx += `- ${mat}: ${note}/20\n`;
      });
    }
    if (analyse.moyenne) ctx += `- Moyenne générale : ${analyse.moyenne}/20\n`;
    if (analyse.pointsForts) ctx += `- Points forts : ${analyse.pointsForts.join(', ')}\n`;
    if (analyse.axesAmelioration) ctx += `- Axes d'amélioration : ${analyse.axesAmelioration.join(', ')}\n\n`;
    ctx += `Utilise ces notes comme base principale de raisonnement: ne les remplace pas par des suppositions.\n\n`;
  }

  if (filiere) {
    ctx += `FILIÈRE ACTUELLEMENT EXPLORÉE :\n`;
    ctx += `- Nom : ${filiere.nom}\n`;
    ctx += `- Score de compatibilité : ${filiere.score}\n`;
    ctx += `- Durée : ${filiere.duree}\n`;
    ctx += `- Coût : ${filiere.cout}\n`;
    ctx += `- Débouchés : ${filiere.debouches}\n`;
    ctx += `- Description : ${filiere.description}\n\n`;
    if (Array.isArray(filiere.universites) && filiere.universites.length > 0) {
      ctx += `- Écoles associées : ${filiere.universites.slice(0, 5).map(u => `${u.nom || u.universite || 'École'} (${u.ville || 'BF'})`).join(', ')}\n\n`;
    }
    ctx += `CADRE STRICT DE DISCUSSION : l'élève a cliqué sur cette filière précise. Tu dois donc répondre prioritairement par rapport à "${filiere.nom}" et ne pas refaire une orientation générale.\n`;
    ctx += `Si l'élève demande "je pourrais exercer quoi plus tard", donne les métiers liés à "${filiere.nom}" uniquement, puis explique les compétences et matières à renforcer pour cette filière.\n`;
    ctx += `Ne propose d'autres filières que si l'élève demande explicitement une comparaison, une alternative ou un changement d'orientation.\n\n`;
  }

  ctx += `Réponds de manière concise (3-5 phrases max par idée). Utilise des listes à puces quand c'est pertinent. Sois encourageant mais honnête, avec des recommandations actionnables.`;
  return ctx;
}

// ─── Prompt pour générer l'analyse des bulletins ────────────────────────────
function buildAnalysePrompt(profil, ocrTexts) {
  return `Tu es un système d'analyse scolaire. Analyse les bulletins suivants d'un élève au Burkina Faso.

PROFIL : Série ${profil?.bac || 'D'}, matières favorites : ${(profil?.matieres || []).join(', ')}, carrière : ${profil?.carriere || 'non précisée'}.

TEXTES DES BULLETINS (extraits OCR) :
${Object.entries(ocrTexts).map(([classe, data]) => `--- ${classe} ---\n${data.text || 'Aucun texte'}`).join('\n\n')}

Réponds UNIQUEMENT en JSON valide (sans commentaire, sans markdown) avec cette structure exacte :
{
  "notes": {"Nom matière extraite": 15.5},
  "moyenne": 14.2,
  "pointsForts": ["Nom matière extraite"],
  "axesAmelioration": ["Nom matière extraite"],
  "conseilIA": "Phrase de conseil personnalisé de 2-3 lignes."
}

Utilise uniquement les matières et notes présentes dans les données OCR. Si les données sont illisibles, réponds avec {"erreur":"Données illisibles"} au lieu d'inventer des notes.`;
}

// ─── Prompt pour générer les recommandations ────────────────────────────────
// @param {Array} univData  Tableau chargé depuis assets/universite.json (optionnel)
function buildRecoPrompt(profil, analyse, univData) {
  let filiereSection = '';
  if (univData && univData.length > 0) {
    const uniqueNames = [...new Set(univData.map(u => u.filiere))].sort();
    filiereSection = `\n\nFILIÈRES DISPONIBLES DANS LES UNIVERSITÉS PUBLIQUES DU BURKINA FASO (toutes à ~15 500 FCFA/an) :\n${uniqueNames.map(f => `• ${f}`).join('\n')}\n\nUtilise EXACTEMENT ces noms dans tes recommandations. Choisis les filières qui correspondent au domaine visé, aux notes, aux préférences et à la série du Bac. Laisse "universites": [] vide (les données seront ajoutées séparément).`;
  }

  const carriere = profil?.carriere || 'non précisée';
  return `Tu es un système de recommandation d'orientation universitaire au Burkina Faso.

⚠️ CONTRAINTE ABSOLUE : L'élève veut devenir "${carriere}". Tu DOIS recommander UNIQUEMENT des filières qui mènent directement à ce métier/domaine. Toute filière sans lien direct avec "${carriere}" est STRICTEMENT INTERDITE, même si les notes de l'élève s'y prêtent mieux.

PROFIL :
- Série : ${profil?.bac || 'D'}
- Carrière visée (PRIORITÉ #1) : ${carriere}
- Domaine où l'élève aimerait exercer : ${carriere}
- Matières préférées : ${(profil?.matieres || []).join(', ') || 'non précisées'}
- Budget : ${profil?.budget || 'non précisé'}
- Ville : ${profil?.ville || 'non précisée'}

RÉSULTATS ACADÉMIQUES :
- Notes : ${JSON.stringify(analyse?.notes || {})}
- Moyenne : ${analyse?.moyenne || 'N/A'}/20
- Points forts : ${(analyse?.pointsForts || []).join(', ')}
- Axes à renforcer : ${(analyse?.axesAmelioration || []).join(', ')}
${filiereSection}

Recommande EXACTEMENT 3 filières menant à la carrière "${carriere}", classées par score de compatibilité décroissant.
Dans chaque description, explique explicitement comment cette filière conduit à "${carriere}" et cite au moins une note, une préférence ou la série du Bac pour justifier le conseil.

Réponds UNIQUEMENT en JSON valide (sans markdown) :
{
  "filieres": [
    {
      "nom": "Nom exact de la filière (depuis la liste ci-dessus)",
      "score": 87,
      "description": "2-3 phrases expliquant la filière et comment elle mène à ${carriere} au Burkina Faso.",
      "duree": "3 – 5 ans",
      "cout": "~15 500 FCFA/an",
      "debouches": "Forte demande",
      "universites": []
    }
  ]
}`;
}
