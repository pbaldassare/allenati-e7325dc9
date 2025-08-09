-- =====================================================
-- SISTEMA GESTIONE PALESTRA CON SEPARAZIONE BACKOFFICE/MOBILE
-- =====================================================

-- 1. TIPI ENUM PER RUOLI E PERMESSI
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'instructor', 'staff', 'premium_user', 'basic_user');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trial');
CREATE TYPE public.booking_status AS ENUM ('confirmed', 'waitlist', 'cancelled', 'completed', 'no_show');
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE public.notification_type AS ENUM ('booking', 'payment', 'course_update', 'achievement', 'system');
CREATE TYPE public.access_level AS ENUM ('backoffice', 'mobile', 'both');

-- 2. FUNZIONE UPDATE TIMESTAMP
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TABELLE CORE - UTENTI E RUOLI

-- Profili utenti
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    fiscal_code TEXT UNIQUE,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    profile_picture_url TEXT,
    bio TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ruoli utenti (un utente può avere più ruoli)
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(user_id, role)
);

-- Permessi granulari
CREATE TABLE public.permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    resource TEXT NOT NULL, -- es: 'courses', 'users', 'bookings'
    action TEXT NOT NULL, -- es: 'create', 'read', 'update', 'delete'
    access_level access_level NOT NULL DEFAULT 'both',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permessi per ruolo
CREATE TABLE public.role_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    role app_role NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    UNIQUE(role, permission_id)
);

-- 4. SISTEMA CORSI E ISTRUTTORI

-- Categorie corsi
CREATE TABLE public.course_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color_hex TEXT,
    icon_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Istruttori
CREATE TABLE public.instructors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bio TEXT,
    specializations TEXT[],
    certifications TEXT[],
    experience_years INTEGER,
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Corsi
CREATE TABLE public.courses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES public.course_categories(id),
    instructor_id UUID NOT NULL REFERENCES public.instructors(id),
    max_participants INTEGER NOT NULL DEFAULT 20,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    price_per_session DECIMAL(10,2),
    credits_required INTEGER NOT NULL DEFAULT 1,
    requirements TEXT[],
    benefits TEXT[],
    equipment_needed TEXT[],
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Programmazione corsi
CREATE TABLE public.course_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Domenica
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. SISTEMA ABBONAMENTI E PAGAMENTI

-- Piani abbonamento
CREATE TABLE public.subscription_plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL,
    credits_included INTEGER NOT NULL DEFAULT 0,
    unlimited_access BOOLEAN NOT NULL DEFAULT false,
    features TEXT[],
    is_trial BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Abbonamenti utenti
CREATE TABLE public.user_subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status subscription_status NOT NULL DEFAULT 'active',
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transazioni crediti
CREATE TABLE public.credits_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positivo per aggiunta, negativo per utilizzo
    balance_after INTEGER NOT NULL,
    transaction_type TEXT NOT NULL, -- 'subscription', 'purchase', 'booking', 'refund'
    reference_id UUID, -- riferimento a booking, subscription, etc.
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pagamenti
CREATE TABLE public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    status payment_status NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    transaction_id TEXT UNIQUE,
    reference_type TEXT, -- 'subscription', 'product', 'credits'
    reference_id UUID,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. SISTEMA PRENOTAZIONI

-- Prenotazioni
CREATE TABLE public.bookings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    status booking_status NOT NULL DEFAULT 'confirmed',
    credits_used INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    checked_in_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Storico prenotazioni
CREATE TABLE public.booking_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    old_status booking_status,
    new_status booking_status NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    change_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. SISTEMA GAMIFICATION

-- Achievement disponibili
CREATE TABLE public.achievements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_name TEXT,
    points_reward INTEGER NOT NULL DEFAULT 0,
    badge_color TEXT,
    criteria JSONB, -- condizioni per sbloccare
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Achievement utenti
CREATE TABLE public.user_achievements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    points_earned INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, achievement_id)
);

-- Transazioni punti
CREATE TABLE public.points_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type TEXT NOT NULL, -- 'achievement', 'booking', 'purchase', 'referral'
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. AREA BACKOFFICE (solo per admin/staff)

-- Configurazioni admin
CREATE TABLE public.admin_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Turni staff
CREATE TABLE public.staff_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES auth.users(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    role TEXT, -- 'reception', 'cleaning', 'maintenance'
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Report finanziari
CREATE TABLE public.financial_reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    report_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_revenue DECIMAL(12,2),
    total_bookings INTEGER,
    new_subscribers INTEGER,
    active_users INTEGER,
    data JSONB, -- dati dettagliati del report
    generated_by UUID REFERENCES auth.users(id),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log azioni amministrative
CREATE TABLE public.admin_action_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_type TEXT, -- 'user', 'course', 'booking', etc.
    target_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. AREA MOBILE APP

-- Preferenze app utente
CREATE TABLE public.user_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
    language TEXT DEFAULT 'it',
    notifications_enabled BOOLEAN DEFAULT true,
    push_bookings BOOLEAN DEFAULT true,
    push_promotions BOOLEAN DEFAULT false,
    auto_checkin BOOLEAN DEFAULT false,
    favorite_instructors UUID[],
    favorite_courses UUID[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifiche mobile
CREATE TABLE public.mobile_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    data JSONB, -- dati aggiuntivi per deep linking
    read_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    push_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contenuti dinamici app
CREATE TABLE public.app_content (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    title TEXT,
    content TEXT,
    image_url TEXT,
    link_url TEXT,
    target_audience TEXT[], -- ruoli che possono vedere il contenuto
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tracking attività utente
CREATE TABLE public.user_activity_tracking (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    activity_type TEXT NOT NULL, -- 'login', 'booking', 'view_course', etc.
    metadata JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. SISTEMA SHOP (OPZIONALE)

-- Prodotti
CREATE TABLE public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category TEXT,
    sku TEXT UNIQUE,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    images TEXT[],
    features TEXT[],
    is_digital BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Carrello
CREATE TABLE public.shopping_cart (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- Ordini
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    shipping_address JSONB,
    payment_id UUID REFERENCES public.payments(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Articoli ordine
CREATE TABLE public.order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL
);

-- TRIGGER PER TIMESTAMP AUTOMATICI
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE ON public.instructors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_schedules_updated_at BEFORE UPDATE ON public.staff_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_app_content_updated_at BEFORE UPDATE ON public.app_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ABILITAZIONE RLS SU TUTTE LE TABELLE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- FUNZIONE PER CONTROLLO RUOLI (SECURITY DEFINER per evitare ricorsioni RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- FUNZIONE PER CONTROLLO ADMIN/STAFF (per backoffice)
CREATE OR REPLACE FUNCTION public.is_backoffice_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin', 'instructor', 'staff')
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- TRIGGER PER CREAZIONE PROFILO AUTOMATICA
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Crea profilo automaticamente
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Nome'),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Cognome')
  );
  
  -- Assegna ruolo basic_user di default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'basic_user');
  
  -- Crea preferenze app di default
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- INDICI PER PERFORMANCE
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_course_id ON public.bookings(course_id);
CREATE INDEX idx_bookings_date ON public.bookings(scheduled_date);
CREATE INDEX idx_credits_transactions_user_id ON public.credits_transactions(user_id);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_course_schedules_course_id ON public.course_schedules(course_id);
CREATE INDEX idx_mobile_notifications_user_id ON public.mobile_notifications(user_id);
CREATE INDEX idx_user_activity_tracking_user_id ON public.user_activity_tracking(user_id);

-- INSERIMENTO DATI INIZIALI

-- Permessi base
INSERT INTO public.permissions (name, description, resource, action, access_level) VALUES
('manage_users', 'Gestione completa utenti', 'users', 'all', 'backoffice'),
('view_users', 'Visualizzazione utenti', 'users', 'read', 'both'),
('manage_courses', 'Gestione completa corsi', 'courses', 'all', 'backoffice'),
('view_courses', 'Visualizzazione corsi', 'courses', 'read', 'both'),
('manage_bookings', 'Gestione prenotazioni', 'bookings', 'all', 'backoffice'),
('create_booking', 'Creare prenotazioni', 'bookings', 'create', 'mobile'),
('view_own_bookings', 'Vedere proprie prenotazioni', 'bookings', 'read', 'mobile'),
('view_financial_reports', 'Vedere report finanziari', 'reports', 'read', 'backoffice'),
('manage_shop', 'Gestione shop', 'shop', 'all', 'backoffice'),
('use_shop', 'Utilizzare shop', 'shop', 'read', 'mobile');

-- Assegnazione permessi ai ruoli
INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'super_admin', id FROM public.permissions; -- Super admin ha tutti i permessi

INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'admin', id FROM public.permissions WHERE name IN ('manage_users', 'view_users', 'manage_courses', 'view_courses', 'manage_bookings', 'view_financial_reports', 'manage_shop');

INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'instructor', id FROM public.permissions WHERE name IN ('view_users', 'view_courses', 'manage_bookings');

INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'staff', id FROM public.permissions WHERE name IN ('view_users', 'view_courses', 'create_booking', 'view_own_bookings');

INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'premium_user', id FROM public.permissions WHERE name IN ('view_courses', 'create_booking', 'view_own_bookings', 'use_shop');

INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'basic_user', id FROM public.permissions WHERE name IN ('view_courses', 'create_booking', 'view_own_bookings');

-- Categorie corsi iniziali
INSERT INTO public.course_categories (name, description, color_hex, icon_name) VALUES
('BJJ', 'Brazilian Jiu-Jitsu', '#1E40AF', 'shield'),
('MMA', 'Mixed Martial Arts', '#DC2626', 'swords'),
('Boxing', 'Pugilato', '#F59E0B', 'hand'),
('Yoga', 'Yoga e Meditazione', '#10B981', 'heart'),
('Wrestling', 'Lotta libera', '#7C3AED', 'trophy'),
('Kickboxing', 'Kickboxing', '#EF4444', 'zap'),
('Functional', 'Allenamento Funzionale', '#06B6D4', 'activity');

-- Piani abbonamento iniziali
INSERT INTO public.subscription_plans (name, description, price, duration_days, credits_included, features) VALUES
('Trial', 'Prova gratuita 7 giorni', 0.00, 7, 3, ARRAY['3 lezioni incluse', 'Accesso a tutti i corsi', 'App mobile']),
('Basic', 'Piano base mensile', 49.90, 30, 8, ARRAY['8 lezioni al mese', 'Accesso a tutti i corsi', 'App mobile', 'Prenotazione online']),
('Premium', 'Piano premium mensile', 89.90, 30, 20, ARRAY['20 lezioni al mese', 'Accesso illimitato', 'App mobile', 'Prenotazione prioritaria', 'Personal trainer incluso']);

-- Achievement iniziali
INSERT INTO public.achievements (name, description, icon_name, points_reward, criteria) VALUES
('Prima Lezione', 'Completa la tua prima lezione', 'star', 10, '{"type": "booking_completed", "count": 1}'),
('Settimana Guerriero', 'Partecipa a 3 lezioni in una settimana', 'calendar', 25, '{"type": "bookings_per_week", "count": 3}'),
('Mese Dedicato', 'Partecipa a 15 lezioni in un mese', 'trophy', 50, '{"type": "bookings_per_month", "count": 15}'),
('Specialista BJJ', 'Completa 10 lezioni di BJJ', 'shield', 30, '{"type": "category_bookings", "category": "BJJ", "count": 10}'),
('Amico della Palestra', 'Invita 3 amici che si iscrivono', 'users', 100, '{"type": "referrals", "count": 3}');

-- Configurazioni admin iniziali
INSERT INTO public.admin_settings (key, value, description, category) VALUES
('gym_name', '"Fight Club Gym"', 'Nome della palestra', 'general'),
('gym_address', '"Via Roma 123, Milano"', 'Indirizzo palestra', 'general'),
('gym_phone', '"+39 02 1234567"', 'Telefono palestra', 'general'),
('booking_advance_days', '7', 'Giorni di anticipo per prenotazioni', 'bookings'),
('cancellation_hours', '24', 'Ore di anticipo per cancellazioni', 'bookings'),
('max_daily_bookings', '3', 'Massimo prenotazioni giornaliere per utente', 'bookings'),
('trial_credits', '3', 'Crediti inclusi nel trial', 'subscriptions');

-- Contenuti app iniziali
INSERT INTO public.app_content (key, title, content, target_audience, is_active) VALUES
('welcome_message', 'Benvenuto!', 'Benvenuto nel nostro Fight Club! Inizia il tuo percorso di crescita personale.', ARRAY['basic_user', 'premium_user'], true),
('premium_promo', 'Diventa Premium', 'Passa al piano Premium e ottieni lezioni illimitate!', ARRAY['basic_user'], true),
('instructor_tips', 'Consigli per Istruttori', 'Suggerimenti per gestire al meglio le tue classi.', ARRAY['instructor'], true);