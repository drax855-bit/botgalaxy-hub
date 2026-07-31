REVOKE ALL ON FUNCTION public.is_botgalaxy_owner(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.has_admin_permission(uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.is_user_banned(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_botgalaxy_owner(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO service_role;