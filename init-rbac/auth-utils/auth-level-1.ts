import { createClient } from "@/utils/supabase/server";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  user_role: string;
  workspace?: { workspace_id: string; role: string };
}

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
