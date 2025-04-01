-- =========================================================
-- 1. Enable RLS on all public tables
-- =========================================================
DO $$
DECLARE r RECORD;
BEGIN -- Loop through each table in the public schema
FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
) LOOP -- Enable RLS on each table
EXECUTE format(
    'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;',
    r.tablename
);
END LOOP;
END;
$$;
-- =========================================================
-- 1.2. Allow Supabase client operations from Next.js
-- [Not part of Supabase Docs]
-- =========================================================
-- Set to allow supabase.from("table_name") request to work from nextjs.
GRANT USAGE ON SCHEMA "public" TO anon;
GRANT USAGE ON SCHEMA "public" TO authenticated;
GRANT SELECT,
    INSERT,
    UPDATE ON ALL TABLES IN SCHEMA "public" TO authenticated;
GRANT SELECT,
    INSERT,
    UPDATE ON ALL TABLES IN SCHEMA "public" TO anon;
-- =========================================================
-- 2. Create Auth Hook to apply user role
-- =========================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE claims jsonb;
user_role text;
BEGIN claims := event->'claims';
-- Get the user's global role using user.id
SELECT ur.role INTO user_role
FROM public.user_roles ur
WHERE ur.user_id = (
        SELECT id
        FROM public.users
        WHERE user_id = (event->>'user_id')::text
    )
ORDER BY ur.created_at DESC
LIMIT 1;
-- Add global role to claims
claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
-- Grant schema usage to auth admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
-- Revoke public access
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook
FROM authenticated,
    anon,
    public;
-- Grant access to necessary tables
GRANT SELECT ON users,
    user_roles TO supabase_auth_admin;
GRANT SELECT ON role_permissions TO supabase_auth_admin;
-- Create policies for access token hook
CREATE POLICY "Allow auth admin to read users" ON public.users AS PERMISSIVE FOR
SELECT TO supabase_auth_admin USING (true);
CREATE POLICY "Allow auth admin to read user roles" ON public.user_roles AS PERMISSIVE FOR
SELECT TO supabase_auth_admin USING (true);
-- currently testing on supabase sql edito
-- Don't forget to actavate the Auth Hooks in the Supabase Console
-- =========================================================
-- 4. USER AUTHORIZATION FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION public.authorize_user(requested_permission TEXT) RETURNS BOOLEAN AS $$
DECLARE jwt_role TEXT;
permission_count INT;
BEGIN -- 🔹 Extract global role from JWT
jwt_role := auth.jwt()->>'user_role';
IF jwt_role IS NULL THEN RETURN FALSE;
END IF;
-- ✅ Validate permission
SELECT COUNT(*) INTO permission_count
FROM public.role_permissions rp
    JOIN public.roles r ON r.id = rp.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
WHERE r.name = jwt_role
    AND p.name = requested_permission;
RETURN permission_count > 0;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = '';
-- =========================================================
-- 5. CREATE SECURITY POLICIES
-- =========================================================
create policy "Allow read access to organizations via workspace access" on public.organizations for
select to authenticated using (
        authorize_user('READ_ORGANIZATION')
    );
-- TESTED & WORKING - 2025/03/25, 7:23am
create policy "Allow authorized update access to organizations" ON public.organizations FOR
update TO authenticated USING (
        authorize_user('UPDATE_ORGANIZATION')
    ) WITH CHECK (authorize_user('UPDATE_ORGANIZATION'));
-- TESTED & WORKING - 2025/03/25, 8:23am
create policy "Allow authorized insert access to address" ON public.addresses FOR
insert TO authenticated WITH CHECK (authorize_user('CREATE_ADDRESS'));
-- TESTED & WORKING - 2025/03/25, 8:23am
create policy "Allow authorized read access to address" ON public.addresses FOR
select TO authenticated USING (authorize_user('CREATE_ADDRESS'));