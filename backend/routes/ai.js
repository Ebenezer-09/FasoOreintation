/**
 * Routes IA
 * Les clés Groq restent côté serveur et sont lues depuis backend/.env.
 */

const express = require('express');
const { initSupabase } = require('../supabase-client');

const router = express.Router();

const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = {
  chat: process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile',
  recommendation: process.env.GROQ_RECOMMENDATION_MODEL || process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile',
  extraction: process.env.GROQ_EXTRACTION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
};

function getGroqKeys() {
  const keys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
  return String(keys)
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
}

async function requireUser(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token non fourni',
      });
    }

    const sb = initSupabase();
    const { data, error } = await sb.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou expiré',
      });
    }

    req.user = data.user;
    return next();
  } catch (error) {
    console.error('Erreur vérification utilisateur IA:', error);
    return res.status(401).json({
      success: false,
      message: 'Token invalide',
    });
  }
}

router.post('/chat', requireUser, async (req, res) => {
  const keys = getGroqKeys();
  const { messages, maxTokens, temperature, task = 'chat', model } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'messages doit être un tableau non vide',
    });
  }

  if (keys.length === 0) {
    return res.status(500).json({
      success: false,
      message: 'Aucune clé Groq configurée côté serveur',
    });
  }

  const selectedModel = model || GROQ_MODELS[task] || GROQ_MODELS.chat;
  const errors = [];

  for (const [idx, key] of keys.entries()) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          max_tokens: maxTokens || 1024,
          temperature: temperature ?? 0.7,
        }),
      });

      const responseText = await response.text();

      if (response.ok) {
        const data = JSON.parse(responseText);
        return res.status(200).json({
          success: true,
          content: data.choices?.[0]?.message?.content || '',
          model: selectedModel,
        });
      }

      const lowerErr = responseText.toLowerCase();
      const isLimitError =
        response.status === 429 ||
        lowerErr.includes('rate limit') ||
        lowerErr.includes('quota') ||
        lowerErr.includes('limit exceeded') ||
        lowerErr.includes('insufficient_quota');

      errors.push(`key#${idx + 1} -> ${response.status}: ${responseText}`);

      if (isLimitError) {
        continue;
      }
    } catch (error) {
      errors.push(`key#${idx + 1} -> ${error.message}`);
    }
  }

  return res.status(502).json({
    success: false,
    message: 'Groq API a échoué avec toutes les clés configurées',
    details: errors,
  });
});

module.exports = router;
