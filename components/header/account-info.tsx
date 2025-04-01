"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { isLoggedIn, isAdmin } from "@/lib/auth-client";
import { signOutAction } from "@/app/actions";
import { useRouter } from "next/navigation";
import { usePopover } from "./account-button";

export function AccountInfo() {
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const { closePopover } = usePopover();

  useEffect(() => {
    const checkAuthStatus = async () => {
      const loggedIn = await isLoggedIn();
      setIsUserLoggedIn(loggedIn);

      if (loggedIn) {
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
      }
    };
    checkAuthStatus();
  }, []);

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoggingOut(true);
      // Close the popover immediately for better UX
      closePopover();
      await signOutAction();
      router.push("/sign-in");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Close popover when clicking on any link
  const handleLinkClick = () => {
    closePopover();
  };

  return (
    <>
      {isUserLoggedIn ? (
        <>
          <div className="p-2 border-b">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">John Doe</p>
              <p className="text-xs text-muted-foreground">
                john.doe@example.com
              </p>
              {isUserAdmin && (
                <p className="text-xs font-semibold text-primary">Admin</p>
              )}
            </div>
          </div>
          <div className="grid gap-1 p-2">
            <Link
              href="#"
              className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted focus:outline-none"
              onClick={handleLinkClick}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 9h6" />
                <path d="M9 15h6" />
              </svg>
              Dashboard
            </Link>
            <Link
              href="#"
              className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted focus:outline-none"
              onClick={handleLinkClick}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <path d="M9 5H2v7h7V5Z" />
                <path d="M22 5h-7v7h7V5Z" />
                <path d="M9 19H2v-7h7v7Z" />
                <path d="M22 19h-7v-7h7v7Z" />
              </svg>
              Orders
            </Link>
            <Link
              href="#"
              className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted focus:outline-none"
              onClick={handleLinkClick}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
              Billing
            </Link>
            {isUserAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted focus:outline-none"
                onClick={handleLinkClick}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Admin Panel
              </Link>
            )}
          </div>
          <div className="p-2 border-t">
            <form onSubmit={handleLogout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-muted focus:outline-none"
                disabled={isLoggingOut}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="grid gap-1 p-2">
          <Link
            href="/sign-in"
            className="flex items-center justify-center gap-2 rounded-md p-2 text-sm hover:bg-muted focus:outline-none"
            onClick={handleLinkClick}
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="flex items-center justify-center gap-2 rounded-md p-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none"
            onClick={handleLinkClick}
          >
            Sign up
          </Link>
        </div>
      )}
    </>
  );
}
