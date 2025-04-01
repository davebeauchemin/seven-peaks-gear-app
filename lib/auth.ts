import { createClient } from "@/utils/supabase/server";
import { createClient as createClientClient } from "@/utils/supabase/client";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  user_role: string;
  workspace?: { workspace_id: string; role: string };
}

// Global Role Specific Functions

export async function getUserRole(): Promise<string | undefined> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) return undefined;

  try {
    const decoded = jwtDecode<TokenPayload>(token);
    return decoded.user_role;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return undefined;
  }
}

export async function isSuperAdmin(): Promise<boolean> {
  const userRole = await getUserRole();
  if (!userRole) return false;
  return userRole === "SUPERADMIN";
}

export async function isLoggedIn(token?: string): Promise<boolean> {
  if (!token) {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    token = session?.access_token;
  }
  if (!token) return false;
  return true;
}

// Workspace Specific Functions
export async function getWorkspaceIdFromToken(): Promise<string | undefined> {
  const supabase = createClientClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return undefined;
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    return decoded.workspace?.workspace_id;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return undefined;
  }
}

// Client Version Functions
export function getUserRoleClient(): Promise<string | undefined> {
  const supabase = createClientClient();
  return supabase.auth.getSession().then(({ data: { session } }) => {
    const token = session?.access_token;
    if (!token) return undefined;

    try {
      const decoded = jwtDecode<TokenPayload>(token);
      return decoded.user_role;
    } catch (error) {
      console.error("Failed to decode token:", error);
      return undefined;
    }
  });
}

export function isSuperAdminClient(): Promise<boolean> {
  return getUserRoleClient().then((userRole) => {
    if (!userRole) return false;
    return userRole === "SUPERADMIN";
  });
}

export function isLoggedInClient(): Promise<boolean> {
  const supabase = createClientClient();
  return supabase.auth.getSession().then(({ data: { session } }) => {
    return !!session?.access_token;
  });
}
