-- admin_permissions
CREATE TABLE public.admin_permissions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  approve_bots boolean NOT NULL DEFAULT false,
  delete_bots boolean NOT NULL DEFAULT false,
  verify_bots boolean NOT NULL DEFAULT false,
  feature_bots boolean NOT NULL DEFAULT false,
  view_users boolean NOT NULL DEFAULT false,
  ban_users boolean NOT NULL DEFAULT false,
  manage_reports boolean NOT NULL DEFAULT false,
  manage_reviews boolean NOT NULL DEFAULT false,
  manage_categories boolean NOT NULL DEFAULT false,
  manage_moderators boolean NOT NULL DEFAULT false,
  view_audit_logs boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_permissions TO service_role;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin permissions readable by admins"
ON public.admin_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- admin_requests
CREATE TYPE public.admin_request_status AS ENUM ('pending','approved','denied','cancelled');

CREATE TABLE public.admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_email text NOT NULL,
  requested_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.admin_request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX admin_requests_pending_email_idx
ON public.admin_requests (lower(requested_email))
WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.admin_requests TO authenticated;
GRANT ALL ON public.admin_requests TO service_role;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin requests readable by admins"
ON public.admin_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin requests insert by admins"
ON public.admin_requests FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND requested_by = auth.uid());

CREATE POLICY "admin requests cancel own"
ON public.admin_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND requested_by = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin') AND requested_by = auth.uid());

-- user_bans
CREATE TABLE public.user_bans (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  banned_at timestamptz NOT NULL DEFAULT now(),
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_bans TO authenticated;
GRANT ALL ON public.user_bans TO service_role;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bans readable by self or admins"
ON public.user_bans FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- user_moderation_logs
CREATE TABLE public.user_moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_moderation_logs TO authenticated;
GRANT ALL ON public.user_moderation_logs TO service_role;
ALTER TABLE public.user_moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moderation logs readable by admins"
ON public.user_moderation_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_admin_permissions_updated_at BEFORE UPDATE ON public.admin_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_admin_requests_updated_at BEFORE UPDATE ON public.admin_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_bans_updated_at BEFORE UPDATE ON public.user_bans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- helpers
CREATE OR REPLACE FUNCTION public.is_botgalaxy_owner(target_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = target_user_id
      AND lower(u.email) = 'draxgaming855@gmail.com'
  );
$$;

REVOKE ALL ON FUNCTION public.is_botgalaxy_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_botgalaxy_owner(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_admin_permission(target_user_id uuid, permission_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE allowed boolean;
BEGIN
  IF public.is_botgalaxy_owner(target_user_id) THEN
    RETURN true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id AND role = 'admin') THEN
    RETURN false;
  END IF;

  IF permission_name NOT IN (
    'approve_bots','delete_bots','verify_bots','feature_bots','view_users','ban_users',
    'manage_reports','manage_reviews','manage_categories','manage_moderators','view_audit_logs'
  ) THEN
    RETURN false;
  END IF;

  EXECUTE format('SELECT COALESCE(%I, false) FROM public.admin_permissions WHERE user_id = $1', permission_name)
  INTO allowed USING target_user_id;

  RETURN COALESCE(allowed, false);
END; $$;

REVOKE ALL ON FUNCTION public.has_admin_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_user_banned(target_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans b
    WHERE b.user_id = target_user_id
      AND b.active
      AND (b.expires_at IS NULL OR b.expires_at > now())
  );
$$;

REVOKE ALL ON FUNCTION public.is_user_banned(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.review_admin_request(p_request_id uuid, p_action text, p_reviewer uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.admin_requests;
BEGIN
  IF NOT public.is_botgalaxy_owner(p_reviewer) THEN
    RAISE EXCEPTION 'Only the BotGalaxy owner can review administrator requests.';
  END IF;

  IF p_action NOT IN ('approve','deny') THEN
    RAISE EXCEPTION 'Invalid review action.';
  END IF;

  SELECT * INTO req FROM public.admin_requests WHERE id = p_request_id AND status = 'pending';

  IF req.id IS NULL THEN
    RAISE EXCEPTION 'The request was not found or was already reviewed.';
  END IF;

  IF p_action = 'approve' THEN
    IF req.requested_user_id IS NULL THEN
      RAISE EXCEPTION 'The requested account no longer exists.';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (req.requested_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.admin_permissions (user_id, updated_by)
    VALUES (req.requested_user_id, p_reviewer)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.admin_requests
    SET status = 'approved', reviewed_by = p_reviewer, reviewed_at = now()
    WHERE id = p_request_id;
  ELSE
    UPDATE public.admin_requests
    SET status = 'denied', reviewed_by = p_reviewer, reviewed_at = now()
    WHERE id = p_request_id;
  END IF;

  INSERT INTO public.admin_audit_logs (actor_id, actor_name, action, target_type, target_id, meta)
  VALUES (p_reviewer, 'BotGalaxy Owner', 'review_admin_request_' || p_action, 'admin_request', p_request_id::text,
          jsonb_build_object('requested_email', req.requested_email, 'requested_user_id', req.requested_user_id));

  RETURN jsonb_build_object('ok', true, 'status', p_action);
END; $$;

REVOKE ALL ON FUNCTION public.review_admin_request(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_admin_request(uuid, text, uuid) TO service_role;