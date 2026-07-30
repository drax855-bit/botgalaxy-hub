
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.bot_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.report_status AS ENUM ('open','resolved','dismissed');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  avatar_url text,
  discord_id text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- first-owner bootstrap: first ever signup becomes admin, everyone gets 'user'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1), 'user'),
          NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- BOTS
CREATE TABLE public.bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  client_id text,
  name text NOT NULL,
  avatar_url text,
  short_description text NOT NULL,
  long_description text,
  tags text[] NOT NULL DEFAULT '{}',
  invite_url text,
  website_url text,
  support_url text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_name text NOT NULL DEFAULT 'Unknown',
  prefix text DEFAULT '/',
  server_count int NOT NULL DEFAULT 0,
  vote_count int NOT NULL DEFAULT 0,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  rating_count int NOT NULL DEFAULT 0,
  view_count int NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  premium boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  status public.bot_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bots TO authenticated;
GRANT SELECT ON public.bots TO anon;
GRANT ALL ON public.bots TO service_role;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved bots public" ON public.bots FOR SELECT USING (status = 'approved');
CREATE POLICY "own bots readable" ON public.bots FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own bots insert" ON public.bots FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "own bots update" ON public.bots FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own bots delete" ON public.bots FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE INDEX bots_status_idx ON public.bots (status);
CREATE INDEX bots_created_idx ON public.bots (created_at DESC);
CREATE INDEX bots_votes_idx ON public.bots (vote_count DESC);
CREATE INDEX bots_servers_idx ON public.bots (server_count DESC);
CREATE INDEX bots_rating_idx ON public.bots (rating DESC);
CREATE INDEX bots_tags_idx ON public.bots USING gin (tags);
CREATE INDEX bots_search_idx ON public.bots USING gin (to_tsvector('english', name || ' ' || short_description || ' ' || coalesce(long_description,'')));
CREATE INDEX bots_name_trgm_idx ON public.bots (lower(name));

CREATE TABLE public.bot_categories (
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (bot_id, category_id)
);
GRANT SELECT, INSERT, DELETE ON public.bot_categories TO authenticated;
GRANT SELECT ON public.bot_categories TO anon;
GRANT ALL ON public.bot_categories TO service_role;
ALTER TABLE public.bot_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bot_categories public read" ON public.bot_categories FOR SELECT USING (true);
CREATE POLICY "bot_categories owner write" ON public.bot_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bots b WHERE b.id = bot_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bots b WHERE b.id = bot_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE INDEX bot_categories_cat_idx ON public.bot_categories (category_id);

-- VOTES
CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bot_id, user_id, period_key)
);
GRANT SELECT, INSERT ON public.votes TO authenticated;
GRANT SELECT ON public.votes TO anon;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes readable" ON public.votes FOR SELECT USING (true);
CREATE POLICY "votes insert own" ON public.votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE INDEX votes_bot_idx ON public.votes (bot_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.bump_vote_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bots SET vote_count = vote_count + 1 WHERE id = NEW.bot_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER votes_bump AFTER INSERT ON public.votes FOR EACH ROW EXECUTE FUNCTION public.bump_vote_count();

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bot_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews readable" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews own insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews own update" ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews own delete" ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX reviews_bot_idx ON public.reviews (bot_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.recalc_bot_rating() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b uuid;
BEGIN
  b := COALESCE(NEW.bot_id, OLD.bot_id);
  UPDATE public.bots SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM public.reviews WHERE bot_id = b),0),
    rating_count = (SELECT COUNT(*) FROM public.reviews WHERE bot_id = b)
  WHERE id = b;
  RETURN NULL;
END; $$;
CREATE TRIGGER reviews_recalc AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.recalc_bot_rating();

-- REPORTS
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('bot','review')),
  target_id uuid NOT NULL,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports own read" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "reports insert" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "reports admin update" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ANALYTICS
CREATE TABLE public.analytics_events (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL,
  path text,
  bot_id uuid REFERENCES public.bots(id) ON DELETE SET NULL,
  search_term text,
  referrer text,
  device text,
  country text,
  visitor_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.analytics_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics admin read" ON public.analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX analytics_created_idx ON public.analytics_events (created_at DESC);
CREATE INDEX analytics_type_idx ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX analytics_visitor_idx ON public.analytics_events (visitor_hash);

-- AUDIT LOG
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  target_type text,
  target_id text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit admin read" ON public.admin_audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX audit_created_idx ON public.admin_audit_logs (created_at DESC);

-- CATEGORY SEED
INSERT INTO public.categories (slug, name, icon, description, sort_order) VALUES
('moderation','Moderation','shield','Automod, logging and safety tooling',1),
('music','Music','music','High quality audio playback',2),
('ai','AI','sparkles','LLM chat, images and assistants',3),
('economy','Economy','coins','Currencies, shops and jobs',4),
('gaming','Gaming','gamepad-2','Game stats and companions',5),
('fun','Fun','partyPopper','Memes, games and randomness',6),
('utility','Utility','wrench','Everyday server helpers',7),
('leveling','Leveling','trending-up','XP, ranks and rewards',8),
('tickets','Tickets','ticket','Support ticket systems',9),
('security','Security','lock','Anti-raid and verification',10),
('giveaways','Giveaways','gift','Run fair giveaways',11),
('social','Social','users','Social feeds and profiles',12),
('applications','Applications','clipboard-list','Staff and member applications',13),
('analytics','Analytics','bar-chart-3','Server insights and stats',14),
('automation','Automation','zap','Workflows and triggers',15),
('invites','Invites','user-plus','Invite tracking and rewards',16),
('community','Community','heart','Engagement and events',17),
('multipurpose','Multipurpose','layers','All-in-one bots',18),
('notifications','Notifications','bell','Alerts from anywhere',19),
('education','Education','graduation-cap','Learning and study tools',20),
('roles','Roles','tags','Reaction and self roles',21),
('support','Support','life-buoy','Helpdesk and FAQ bots',22);
