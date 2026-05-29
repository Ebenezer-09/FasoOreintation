/**
 * Configuration Supabase pour Backend Express
 * Exemple d'intégration complète
 */

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
require('dotenv').config();

// ============================================================================
// 1. INITIALISER SUPABASE CLIENT
// ============================================================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Lazy load Supabase client pour éviter les problèmes de WebSocket
let supabase = null;
let supabaseAuth = null;

function initSupabase() {
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: ws,
      },
      global: {
        fetch: fetch,
      },
    });
  }
  return supabase;
}

function initSupabaseAuth() {
  if (!supabaseAuth) {
    supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: ws,
      },
      global: {
        fetch: fetch,
      },
    });
  }
  return supabaseAuth;
}

// ============================================================================
// 2. AUTHENTIFICATION
// ============================================================================

// Inscription d'un nouvel utilisateur
async function registerUser(email, password, firstName, lastName, phone) {
  try {
    const sb = initSupabaseAuth();
    const sbServer = initSupabase();

    // Créer l'utilisateur dans Supabase Auth
    const { data: authUser, error: authError } = await sbServer.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      }
    });

    if (authError) throw authError;

    // Créer l'enregistrement utilisateur dans la table users
    const { data: user, error: userError } = await sbServer
      .from('users')
      .insert([
        {
          id: authUser.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          password_hash: authUser.user.id, // Supabase gère le hash
        }
      ])
      .select();

    if (userError) throw userError;

    // Créer le profil utilisateur
    const { error: profileError } = await sbServer
      .from('user_profiles')
      .insert([{ user_id: authUser.user.id }]);

    if (profileError) throw profileError;

    return { success: true, user: user[0], authUser: authUser.user };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// Connexion utilisateur
async function loginUser(email, password) {
  try {
    const sb = initSupabaseAuth();

    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    return { success: true, session: data.session };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// ============================================================================
// 3. PROFIL UTILISATEUR
// ============================================================================

// Obtenir le profil complet d'un utilisateur
async function getUserCompleteProfile(userId) {
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('user_complete_profile')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
}

// Mettre à jour le profil utilisateur
async function updateUserProfile(userId, profileData) {
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('user_profiles')
      .update({
        bac_series: profileData.bac_series,
        favorite_subjects: profileData.favorite_subjects,
        career_interests: profileData.career_interests,
        budget_annual: profileData.budget_annual,
        preferred_city: profileData.preferred_city,
        has_completed_onboarding: true,
      })
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
}

// ============================================================================
// 4. BULLETINS SCOLAIRES
// ============================================================================

// Enregistrer un bulletin
async function createAcademicRecord(userId, recordData) {
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('academic_records')
      .insert([
        {
          user_id: userId,
          school_year: recordData.school_year,
          class_level: recordData.class_level,
          school_name: recordData.school_name,
          file_url: recordData.file_url,
          ocr_text: recordData.ocr_text,
          is_processed: false,
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Create academic record error:', error);
    throw error;
  }
}

// Ajouter des notes
async function addGrades(recordId, grades) {
  try {
    const sb = initSupabase();
    const gradesData = grades.map(g => ({
      academic_record_id: recordId,
      subject: g.subject,
      grade: g.grade,
      max_grade: g.max_grade || 20,
      coefficient: g.coefficient || 1,
    }));

    const { data, error } = await sb
      .from('grades')
      .insert(gradesData)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Add grades error:', error);
    throw error;
  }
}

// Obtenir les bulletins d'un utilisateur
async function getUserAcademicRecords(userId) {
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('academic_records')
      .select(`
        *,
        grades (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get academic records error:', error);
    throw error;
  }
}

// ============================================================================
// 5. ANALYSES ACADÉMIQUES
// ============================================================================

// Créer une analyse académique
async function createAcademicAnalysis(userId, analysisData) {
  try {
    const sb = initSupabase();
    // Calculer la moyenne
    const { data: grades, error: gradesError } = await sb
      .from('grades')
      .select('grade, coefficient')
      .in('academic_record_id', 
        (await sb.from('academic_records').select('id').eq('user_id', userId)).data.map(r => r.id)
      );

    if (gradesError) throw gradesError;

    const totalWeighted = grades.reduce((sum, g) => sum + (g.grade * g.coefficient), 0);
    const totalCoeff = grades.reduce((sum, g) => sum + g.coefficient, 0);
    const average = totalWeighted / totalCoeff;

    // Créer l'enregistrement d'analyse
    const { data, error } = await sb
      .from('academic_analyses')
      .insert([
        {
          user_id: userId,
          average_grade: average,
          total_points: analysisData.total_points || Math.round(average * 20),
          ranking_percentile: analysisData.ranking_percentile,
          strengths: analysisData.strengths,
          weaknesses: analysisData.weaknesses,
          analysis_text: analysisData.analysis_text,
          generated_by: analysisData.generated_by || 'groq_ai',
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Create analysis error:', error);
    throw error;
  }
}

// ============================================================================
// 6. RECOMMANDATIONS
// ============================================================================

// Créer des recommandations
async function createRecommendations(userId, recommendations) {
  try {
    const sb = initSupabase();
    const recoData = recommendations.map(r => ({
      user_id: userId,
      program_id: r.program_id,
      compatibility_score: r.score,
      reasoning: r.reasoning,
      generated_by: r.generated_by || 'groq_ai',
    }));

    const { data, error } = await sb
      .from('recommendations')
      .insert(recoData)
      .select(`
        *,
        programs (
          name,
          duration_years,
          tuition_fee,
          universities (name, city),
          faculties (name)
        )
      `);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Create recommendations error:', error);
    throw error;
  }
}

// Obtenir les recommandations d'un utilisateur
async function getUserRecommendations(userId, limit = 10) {
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('recommendations')
      .select(`
        *,
        programs (
          id,
          name,
          acronym,
          duration_years,
          level,
          tuition_fee,
          universities (id, name, city),
          faculties (id, name)
        )
      `)
      .eq('user_id', userId)
      .order('compatibility_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get recommendations error:', error);
    throw error;
  }
}

// ============================================================================
// 7. BOURSES
// ============================================================================

// Obtenir les bourses applicables
async function getApplicableScholarships(userId) {
  try {
    const sb = initSupabase();
    // Récupérer la moyenne de l'utilisateur
    const { data: analysis, error: analysisError } = await sb
      .from('academic_analyses')
      .select('average_grade')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (analysisError) throw analysisError;

    // Récupérer les bourses correspondantes
    const { data: scholarships, error: scholarshipError } = await sb
      .from('scholarships')
      .select('*')
      .lte('required_gpa', analysis.average_grade)
      .gt('application_deadline', new Date().toISOString())
      .eq('target_countries', ['Burkina Faso']);

    if (scholarshipError) throw scholarshipError;
    return scholarships;
  } catch (error) {
    console.error('Get applicable scholarships error:', error);
    throw error;
  }
}

// Enregistrer une candidature pour une bourse
async function applyForScholarship(userId, scholarshipId) {
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('user_scholarship_applications')
      .insert([
        {
          user_id: userId,
          scholarship_id: scholarshipId,
          status: 'applied',
          application_date: new Date().toISOString(),
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Apply for scholarship error:', error);
    throw error;
  }
}

// ============================================================================
// 8. CHAT & CONSEILLER IA
// ============================================================================

// Créer une session de chat
async function createChatSession(userId, programId = null) {
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('chat_sessions')
      .insert([
        {
          user_id: userId,
          program_id: programId,
          started_at: new Date().toISOString(),
          is_active: true,
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Create chat session error:', error);
    throw error;
  }
}

// Ajouter un message au chat
async function addChatMessage(sessionId, userId, role, content, tokensUsed = 0, modelUsed = null) {
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('chat_messages')
      .insert([
        {
          session_id: sessionId,
          user_id: userId,
          role, // 'user' ou 'assistant'
          content,
          tokens_used: tokensUsed,
          model_used: modelUsed || 'llama-3.3-70b',
          created_at: new Date().toISOString(),
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Add chat message error:', error);
    throw error;
  }
}

// Obtenir l'historique du chat
async function getChatHistory(sessionId) {
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get chat history error:', error);
    throw error;
  }
}

// ============================================================================
// 9. UNIVERSITÉS & PROGRAMMES
// ============================================================================

// Obtenir toutes les universités
async function getUniversities() {
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('universities')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get universities error:', error);
    throw error;
  }
}

// Obtenir les programmes d'une université
async function getUniversityPrograms(universityId) {
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('programs')
      .select(`
        *,
        faculties (name),
        program_subjects (subject_name)
      `)
      .eq('university_id', universityId)
      .eq('is_active', true);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get university programs error:', error);
    throw error;
  }
}

// Rechercher des programmes
async function searchPrograms(query) {
  try {
    const sb = initSupabase();
    const { data, error } = await sb
      .from('programs')
      .select(`
        *,
        universities (name, city),
        faculties (name)
      `)
      .or(`name.ilike.%${query}%,acronym.ilike.%${query}%`)
      .eq('is_active', true);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Search programs error:', error);
    throw error;
  }
}

// ============================================================================
// 10. ANALYTIQUES
// ============================================================================

// Enregistrer une action utilisateur
async function logUserAction(userId, page, action, data = {}) {
  try {
    const sb = initSupabase();
    const { error } = await sb
      .from('user_analytics')
      .insert([
        {
          user_id: userId,
          page_visited: page,
          action,
          data,
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) throw error;
  } catch (error) {
    console.error('Log user action error:', error);
    // Ne pas lancer l'erreur, c'est juste de l'analytics
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  initSupabase,
  initSupabaseAuth,
  registerUser,
  loginUser,
  getUserCompleteProfile,
  updateUserProfile,
  createAcademicRecord,
  addGrades,
  getUserAcademicRecords,
  createAcademicAnalysis,
  createRecommendations,
  getUserRecommendations,
  getApplicableScholarships,
  applyForScholarship,
  createChatSession,
  addChatMessage,
  getChatHistory,
  getUniversities,
  getUniversityPrograms,
  searchPrograms,
  logUserAction,
};
