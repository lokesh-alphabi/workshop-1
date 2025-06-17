import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Authentication middleware for protecting routes
 * Handles role-based access control and redirects
 */
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Allow access to auth pages when not authenticated
    if (pathname.startsWith("/auth/") && !token) {
      return NextResponse.next();
    }

    // Redirect authenticated users away from auth pages
    if (pathname.startsWith("/auth/") && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Admin-only routes
    if (pathname.startsWith("/admin")) {
      if (!token || (token.role !== "ROOT_ADMIN" && token.role !== "ADMIN")) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // Root Admin-only routes
    if (pathname.startsWith("/system")) {
      if (!token || token.role !== "ROOT_ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // API route protection
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
      if (!token) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // Check specific API permissions
      if (
        pathname.startsWith("/api/admin/") &&
        token.role !== "ROOT_ADMIN" &&
        token.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow public routes
        if (
          pathname === "/" ||
          pathname.startsWith("/auth/") ||
          pathname.startsWith("/api/auth/") ||
          pathname === "/unauthorized"
        ) {
          return true;
        }

        // Require authentication for all other routes
        return !!token;
      },
    },
  }
);

/**
 * Middleware configuration
 * Define which routes should be processed by the middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
