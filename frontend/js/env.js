/**
 * Configuration publique FasoOrientation.
 * Les secrets sont lus par le backend depuis backend/.env et ne doivent pas
 * être définis ici.
 */

const currentOrigin = window.location.origin && window.location.origin !== 'null'
  ? window.location.origin
  : 'http://localhost:3000';

window.FASO_ENV = Object.assign(
  {
    API_BASE_URL: `${currentOrigin}/api`,
    GROQ_CHAT_MODEL: 'llama-3.3-70b-versatile',
    GROQ_RECOMMENDATION_MODEL: 'llama-3.3-70b-versatile',
    GROQ_EXTRACTION_MODEL: 'meta-llama/llama-4-scout-17b-16e-instruct',
  },
  window.FASO_ENV || {},
);
