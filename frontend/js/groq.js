// ─── FasoOrientation · Groq LLM Client ─────────────────────────────────────
const GROQ_API_KEYS = [
  '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',
  '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',
  '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',
];
let currentGroqKeyIndex = 0;
const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL  = 'llama-3.3-70b-versatile';

/**
 * Appelle l'API Groq et renvoie le texte de la réponse.
 * @param {Array<{role:string,content:string}>} messages  Historique de conversation
 * @param {object}  opts                                   Options optionnelles
 * @param {number}  opts.maxTokens                         Limite de tokens (défaut 1024)
 * @param {number}  opts.temperature                       Température (défaut 0.7)
 * @returns {Promise<string>} Texte de la réponse du LLM
 */
async function groqChat(messages, opts = {}) {
  const errors = [];
  const keyCount = GROQ_API_KEYS.length;

  // Try each key once, starting from the current active key.
  for (let attempt = 0; attempt < keyCount; attempt++) {
    const idx = (currentGroqKeyIndex + attempt) % keyCount;
    const key = GROQ_API_KEYS[idx];

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: opts.maxTokens || 1024,
        temperature: opts.temperature ?? 0.7,
      }),
    });

    if (res.ok) {
      currentGroqKeyIndex = idx;
      const data = await res.json();
      return data.choices[0].message.content;
    }

    const err = await res.text();
    const lowerErr = err.toLowerCase();
    const isLimitError =
      res.status === 429 ||
      lowerErr.includes('rate limit') ||
      lowerErr.includes('quota') ||
      lowerErr.includes('limit exceeded') ||
      lowerErr.includes('insufficient_quota');

    errors.push(`key#${idx + 1} -> ${res.status}: ${err}`);

    if (isLimitError) {
      // Continue to next key if this one is limited/quota-exceeded.
      continue;
    }

    // For non-limit errors, still try next key for resilience.
  }

  throw new Error(`Groq API failed on all keys: ${errors.join(' | ')}`);
}

// ─── Prompt système pour le conseiller d'orientation ────────────────────────
function buildSystemPrompt(profil, analyse) {
  let ctx = `Tu es un conseiller d'orientation scolaire bienveillant et expert du système éducatif au Burkina Faso. Tu parles en français simple et encourageant. Tu connais les universités, filières, débouchés et les réalités du marché de l'emploi au Burkina Faso et en Afrique de l'Ouest.\n\n`;

  if (profil) {
    ctx += `PROFIL DE L'ÉLÈVE :\n`;
    ctx += `- Série du Bac : ${profil.bac || 'Non renseigné'}\n`;
    ctx += `- Matières favorites : ${(profil.matieres || []).join(', ') || 'Non renseigné'}\n`;
    ctx += `- Domaine de carrière souhaité : ${profil.carriere || 'Non renseigné'}\n`;
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
  }

  ctx += `Réponds de manière concise (3-5 phrases max par idée). Utilise des listes à puces quand c'est pertinent. Sois encourageant mais honnête.`;
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
  "notes": {"Mathématiques": 15.5, "Physique-Chimie": 14, "SVT": 12, "Français": 11, "Informatique": 17, "Anglais": 13},
  "moyenne": 14.2,
  "pointsForts": ["Mathématiques", "Informatique"],
  "axesAmelioration": ["Français", "SVT"],
  "conseilIA": "Phrase de conseil personnalisé de 2-3 lignes."
}

Adapte les matières et notes aux données OCR. Si les données sont illisibles, propose des notes cohérentes avec la série ${profil?.bac || 'D'} au Burkina Faso.`;
}

// ─── Prompt pour générer les recommandations ────────────────────────────────
// @param {Array} univData  Tableau chargé depuis assets/universite.json (optionnel)
function buildRecoPrompt(profil, analyse, univData) {
  let filiereSection = '';
  if (univData && univData.length > 0) {
    const uniqueNames = [...new Set(univData.map(u => u.filiere))].sort();
    filiereSection = `\n\nFILIÈRES DISPONIBLES DANS LES UNIVERSITÉS PUBLIQUES DU BURKINA FASO (toutes à ~15 500 FCFA/an) :\n${uniqueNames.map(f => `• ${f}`).join('\n')}\n\nUtilise EXACTEMENT ces noms dans tes recommandations. Laisse "universites": [] vide (les données seront ajoutées séparément).`;
  }

  const carriere = profil?.carriere || 'non précisée';
  return `Tu es un système de recommandation d'orientation universitaire au Burkina Faso.

⚠️ CONTRAINTE ABSOLUE : L'élève veut devenir "${carriere}". Tu DOIS recommander UNIQUEMENT des filières qui mènent directement à ce métier/domaine. Toute filière sans lien direct avec "${carriere}" est STRICTEMENT INTERDITE, même si les notes de l'élève s'y prêtent mieux.

PROFIL :
- Série : ${profil?.bac || 'D'}
- Carrière visée (PRIORITÉ #1) : ${carriere}
- Budget : ${profil?.budget || 'non précisé'}
- Ville : ${profil?.ville || 'non précisée'}

RÉSULTATS ACADÉMIQUES :
- Notes : ${JSON.stringify(analyse?.notes || {})}
- Moyenne : ${analyse?.moyenne || 'N/A'}/20
- Points forts : ${(analyse?.pointsForts || []).join(', ')}
${filiereSection}

Recommande EXACTEMENT 3 filières menant à la carrière "${carriere}", classées par score de compatibilité décroissant.
Dans chaque description, explique explicitement comment cette filière conduit à "${carriere}".

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
