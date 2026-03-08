// ─── FasoOrientation · LocalStorage Manager ────────────────────────────────
// Clés utilisées :
//   fo_profil     → { bac, matieres[], carriere, budget, ville }
//   fo_bulletins  → { seconde: {text,grades}, premiere: {…}, terminale: {…}, bac: {…} }
//   fo_analyse    → { notes:{}, moyenne, pointsForts[], axesAmelioration[], conseilIA }
//   fo_reco       → { filieres: [{nom,score,desc,…}] }
//   fo_chat       → [ {role,content,time}, … ]

const FoStorage = {
  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  },
  _set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // ── Profil ──
  saveProfil(data)  { this._set('fo_profil', data); },
  getProfil()       { return this._get('fo_profil'); },

  // ── Bulletins (texte OCR + notes parsées) ──
  saveBulletin(classe, data) {
    const all = this._get('fo_bulletins') || {};
    all[classe] = data;
    this._set('fo_bulletins', all);
  },
  getBulletins()    { return this._get('fo_bulletins') || {}; },

  // ── Analyse IA ──
  saveAnalyse(data) { this._set('fo_analyse', data); },
  getAnalyse()      { return this._get('fo_analyse'); },

  // ── Recommandations ──
  saveReco(data)    { this._set('fo_reco', data); },
  getReco()         { return this._get('fo_reco'); },

  // ── Chat history ──
  saveChat(msgs)    { this._set('fo_chat', msgs); },
  getChat()         { return this._get('fo_chat') || []; },
  clearChat()       { localStorage.removeItem('fo_chat'); },

  // ── Reset tout ──
  clearAll() {
    ['fo_profil','fo_bulletins','fo_analyse','fo_reco','fo_chat'].forEach(k => localStorage.removeItem(k));
  }
};
