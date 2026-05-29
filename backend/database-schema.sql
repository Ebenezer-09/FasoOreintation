/**
 * 🎓 FasoOrientation - Schéma PostgreSQL Complet
 * Structure complète de base de données pour Supabase
 */

-- ============================================================================
-- 1️⃣ AUTHENTIFICATION & UTILISATEURS
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Index pour performances
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token);

-- ============================================================================
-- 2️⃣ PROFILS UTILISATEURS (Orientation)
-- ============================================================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bac_series VARCHAR(50),  -- Littéraire, Scientifique, Technique, etc.
  favorite_subjects TEXT[],  -- Array de matières préférées
  career_interests TEXT,  -- Domaine professionnel souhaité
  budget_annual DECIMAL(10, 2),  -- Budget annuel en FCFA
  preferred_city VARCHAR(100),
  has_completed_onboarding BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON user_profiles(user_id);

-- ============================================================================
-- 3️⃣ UNIVERSITÉS & FILIÈRES
-- ============================================================================

CREATE TABLE universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) DEFAULT 'Burkina Faso',
  website TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  founded_year INTEGER,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT name_city_unique UNIQUE (name, city)
);

CREATE TABLE faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  acronym VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  acronym VARCHAR(50),
  duration_years INTEGER,
  level VARCHAR(50),  -- License, Master, Doctorat
  admission_requirements TEXT,
  tuition_fee DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE program_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  subject_name VARCHAR(100) NOT NULL,
  is_required BOOLEAN DEFAULT true
);

CREATE INDEX idx_universities_city ON universities(city);
CREATE INDEX idx_faculties_university ON faculties(university_id);
CREATE INDEX idx_programs_faculty ON programs(faculty_id);
CREATE INDEX idx_programs_subjects ON program_subjects(program_id);

-- ============================================================================
-- 4️⃣ BULLETINS SCOLAIRES
-- ============================================================================

CREATE TABLE academic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_year VARCHAR(20),  -- Ex: "2024-2025"
  class_level VARCHAR(50),  -- 6ème, Seconde, Terminale, etc.
  school_name VARCHAR(255),
  file_url TEXT,  -- URL du PDF téléchargé
  ocr_text TEXT,  -- Texte extrait par OCR
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_record_id UUID NOT NULL REFERENCES academic_records(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  grade DECIMAL(3, 2),
  max_grade DECIMAL(3, 2) DEFAULT 20,
  coefficient INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT grade_range CHECK (grade >= 0 AND grade <= max_grade)
);

CREATE INDEX idx_records_user ON academic_records(user_id);
CREATE INDEX idx_records_school_year ON academic_records(school_year);
CREATE INDEX idx_grades_record ON grades(academic_record_id);

-- ============================================================================
-- 5️⃣ ANALYSE ACADÉMIQUE
-- ============================================================================

CREATE TABLE academic_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  average_grade DECIMAL(3, 2),
  total_points INTEGER,
  ranking_percentile DECIMAL(5, 2),  -- Position percentile (0-100)
  strengths TEXT[],  -- Matières fortes
  weaknesses TEXT[],  -- Matières faibles
  analysis_text TEXT,  -- Analyse générale par IA
  generated_by VARCHAR(50),  -- 'groq_ai', 'manual', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analyses_user ON academic_analyses(user_id);

-- ============================================================================
-- 6️⃣ RECOMMANDATIONS DE FILIÈRES
-- ============================================================================

CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id),
  compatibility_score DECIMAL(3, 2),  -- 0-100
  reasoning TEXT,  -- Justification
  generated_by VARCHAR(50),  -- 'groq_ai', 'algorithm'
  is_favorite BOOLEAN DEFAULT false,
  saved_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT score_range CHECK (compatibility_score >= 0 AND compatibility_score <= 100)
);

CREATE INDEX idx_recommendations_user ON recommendations(user_id);
CREATE INDEX idx_recommendations_program ON recommendations(program_id);
CREATE INDEX idx_recommendations_score ON recommendations(compatibility_score DESC);

-- ============================================================================
-- 7️⃣ BOURSES & FINANCEMENTS
-- ============================================================================

CREATE TABLE scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(255),  -- Organisation qui offre la bourse
  description TEXT,
  eligibility_criteria TEXT,
  amount_fcfa DECIMAL(10, 2),
  duration_months INTEGER,
  application_deadline DATE,
  required_gpa DECIMAL(3, 2),
  target_countries TEXT[],
  website_url TEXT,
  contact_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_scholarship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scholarship_id UUID NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  status VARCHAR(50),  -- 'viewed', 'applied', 'approved', 'rejected'
  application_date TIMESTAMP,
  result_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT status_valid CHECK (status IN ('viewed', 'applied', 'approved', 'rejected', 'pending'))
);

CREATE INDEX idx_scholarships_deadline ON scholarships(application_deadline);
CREATE INDEX idx_user_scholarships ON user_scholarship_applications(user_id);

-- ============================================================================
-- 📡 SCRAPER BOURSES — Migration (ajout colonne source_platform)
-- ============================================================================

-- Colonne pour tracer la plateforme d'origine de chaque bourse scrapée
ALTER TABLE scholarships
  ADD COLUMN IF NOT EXISTS source_platform VARCHAR(100);

-- Index unique sur website_url pour permettre l'upsert sans doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_scholarships_website_url
  ON scholarships(website_url)
  WHERE website_url IS NOT NULL;

-- ============================================================================
-- 8️⃣ STAGES & OFFRES D'EMPLOI
-- ============================================================================

CREATE TABLE job_internship_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  type VARCHAR(50),  -- 'internship', 'job', 'apprenticeship'
  level VARCHAR(50),  -- 'junior', 'senior', 'entry'
  location VARCHAR(255),
  description TEXT,
  required_skills TEXT[],
  salary_min DECIMAL(10, 2),
  salary_max DECIMAL(10, 2),
  deadline DATE,
  posted_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  contact_email VARCHAR(255),
  website_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_opportunity_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES job_internship_opportunities(id) ON DELETE CASCADE,
  status VARCHAR(50),  -- 'interested', 'applied', 'shortlisted', 'accepted', 'rejected'
  application_date TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_opportunities_deadline ON job_internship_opportunities(deadline);
CREATE INDEX idx_user_applications ON user_opportunity_applications(user_id);

-- ============================================================================
-- 9️⃣ CHAT & CONSEILLER IA
-- ============================================================================

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id),  -- Programme en discussion
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  topic VARCHAR(255)  -- 'orientation', 'career', 'general'
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50),  -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  tokens_used INTEGER,
  model_used VARCHAR(100),  -- 'llama-3.3-70b', etc.
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_messages_session ON chat_messages(session_id);

-- ============================================================================
-- 🔟 STATISTIQUES & ANALYTIQUES
-- ============================================================================

CREATE TABLE user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_visited VARCHAR(100),
  action VARCHAR(100),  -- 'view', 'click', 'save', 'download'
  data JSONB,  -- Données contextuelles
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE platform_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100),
  metric_value INTEGER,
  metric_date DATE DEFAULT CURRENT_DATE,
  dimension JSONB,  -- Données supplémentaires
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_metric UNIQUE (metric_name, metric_date)
);

CREATE INDEX idx_analytics_user ON user_analytics(user_id);
CREATE INDEX idx_analytics_date ON user_analytics(created_at);

-- ============================================================================
-- 1️⃣1️⃣ FEEDBACK & SOUTIEN
-- ============================================================================

CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  category VARCHAR(100),  -- 'bug', 'feature_request', 'general'
  message TEXT NOT NULL,
  email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'new',  -- 'new', 'in_review', 'resolved'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 🔐 PERMISSIONS & RÔLES (optionnel)
-- ============================================================================

CREATE TYPE user_role AS ENUM ('student', 'admin', 'counselor', 'partner');

ALTER TABLE users ADD COLUMN role user_role DEFAULT 'student';

-- ============================================================================
-- 📊 VIEWS POUR REQUÊTES COMMUNES
-- ============================================================================

-- Vue: Profil complet d'un utilisateur
CREATE VIEW user_complete_profile AS
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.phone,
  up.bac_series,
  up.favorite_subjects,
  up.career_interests,
  up.budget_annual,
  up.preferred_city,
  aa.average_grade,
  aa.strengths,
  aa.weaknesses,
  COUNT(DISTINCT r.id) as recommendation_count,
  COUNT(DISTINCT ar.id) as academic_records_count
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN academic_analyses aa ON u.id = aa.user_id
LEFT JOIN recommendations r ON u.id = r.user_id
LEFT JOIN academic_records ar ON u.id = ar.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, up.id, aa.id;

-- Vue: Top recommandations par utilisateur
CREATE VIEW top_recommendations AS
SELECT 
  r.user_id,
  r.program_id,
  p.name as program_name,
  u.name as university_name,
  f.name as faculty_name,
  r.compatibility_score,
  r.reasoning,
  ROW_NUMBER() OVER (PARTITION BY r.user_id ORDER BY r.compatibility_score DESC) as rank
FROM recommendations r
JOIN programs p ON r.program_id = p.id
JOIN universities u ON p.university_id = u.id
JOIN faculties f ON p.faculty_id = f.id;

-- Vue: Universités avec programmes actifs
CREATE VIEW active_universities_programs AS
SELECT 
  u.id,
  u.name as university_name,
  u.city,
  COUNT(DISTINCT p.id) as total_programs,
  COUNT(DISTINCT f.id) as total_faculties
FROM universities u
LEFT JOIN faculties f ON u.id = f.university_id
LEFT JOIN programs p ON p.university_id = u.id AND p.is_active = true
GROUP BY u.id
HAVING COUNT(DISTINCT p.id) > 0;

-- ============================================================================
-- 🔔 FONCTIONS UTILES
-- ============================================================================

-- Fonction pour calculer la moyenne générale
CREATE OR REPLACE FUNCTION calculate_user_average(p_user_id UUID)
RETURNS DECIMAL AS $$
SELECT AVG(g.grade) 
FROM grades g
JOIN academic_records ar ON g.academic_record_id = ar.id
WHERE ar.user_id = p_user_id;
$$ LANGUAGE SQL;

-- Fonction de mise à jour du timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour users
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Triggers pour autres tables
CREATE TRIGGER update_profiles_timestamp
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_analyses_timestamp
BEFORE UPDATE ON academic_analyses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 🔒 POLITIQUES DE SÉCURITÉ (Row Level Security)
-- ============================================================================

-- Activer RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs ne voient que leurs propres données
CREATE POLICY select_own_profile ON users
  FOR SELECT USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY select_own_records ON academic_records
  FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY select_own_recommendations ON recommendations
  FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');


