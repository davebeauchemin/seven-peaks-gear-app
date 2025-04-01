import { createClient } from "@/utils/supabase/client";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  user_role: string;
  workspace?: { workspace_id: string; role: string };
}

/**
 * Gets the user's role from the client-side JWT token
 */
export function getUserRole(): Promise<string | undefined> {
  const supabase = createClient();
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

/**
 * Checks if the user is a super admin from the client side
 */
export function isAdmin(): Promise<boolean> {
  return getUserRole().then((userRole) => {
    if (!userRole) return false;
    return userRole === "ADMIN" || userRole === "SUPERADMIN";
  });
}

/**
 * Checks if the user is logged in from the client side
 */
export function isLoggedIn(): Promise<boolean> {
  const supabase = createClient();
  return supabase.auth.getSession().then(({ data: { session } }) => {
    return !!session?.access_token;
  });
}

/**
 * Gets the user's workspace ID from the client-side JWT token
 */
export function getWorkspaceId(): Promise<string | undefined> {
  const supabase = createClient();
  return supabase.auth.getSession().then(({ data: { session } }) => {
    const token = session?.access_token;
    if (!token) return undefined;
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      return decoded.workspace?.workspace_id;
    } catch (error) {
      console.error("Failed to decode token:", error);
      return undefined;
    }
  });
}
