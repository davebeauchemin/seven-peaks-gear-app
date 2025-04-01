import { getUserRole, getWorkspaceIdFromToken } from "@/lib/auth";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const user = await supabase.auth.getUser();
    // protected routes
    if (request.nextUrl.pathname.startsWith("/protected")) {
      // Check if user is logged in
      if (user.error) {
        // User is not logged in, redirect to sign-in
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }

      // User is logged in, now check if they're an admin
      try {
        const userRole = await getUserRole();
        if (userRole !== "SUPERADMIN") {
          return NextResponse.redirect(new URL("/", request.url));
          // If user is admin, continue (no redirect)
        } else {
          // No token found, redirect to home
          return NextResponse.next();
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        // On error, redirect to home page
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    return response;
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
