import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

/**
 * Get current session on server side
 * Returns null if no session exists
 */
export async function getCurrentSession() {
  return await getServerSession(authOptions);
}

/**
 * Get current user from session
 * Throws error if no session exists
 */
export async function getCurrentUser() {
  const session = await getCurrentSession();

  if (!session?.user) {
    throw new Error("No authenticated user found");
  }

  return session.user;
}

/**
 * Require authentication for server components
 * Redirects to login if not authenticated
 */
export async function requireAuth() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return session.user;
}

/**
 * Require specific role for server components
 * Redirects to unauthorized if insufficient permissions
 */
export async function requireRole(requiredRole: UserRole | UserRole[]) {
  const user = await requireAuth();
  const allowedRoles = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];

  if (!allowedRoles.includes(user.role)) {
    redirect("/unauthorized");
  }

  return user;
}

/**
 * Require admin role (ROOT_ADMIN or ADMIN)
 */
export async function requireAdmin() {
  return await requireRole(["ROOT_ADMIN", "ADMIN"]);
}

/**
 * Require root admin role
 */
export async function requireRootAdmin() {
  return await requireRole("ROOT_ADMIN");
}

/**
 * Check if user has specific role
 */
export function hasRole(
  userRole: UserRole,
  requiredRole: UserRole | UserRole[]
): boolean {
  const allowedRoles = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];
  return allowedRoles.includes(userRole);
}

/**
 * Check if user is admin (ROOT_ADMIN or ADMIN)
 */
export function isAdmin(userRole: UserRole): boolean {
  return hasRole(userRole, ["ROOT_ADMIN", "ADMIN"]);
}

/**
 * Check if user is root admin
 */
export function isRootAdmin(userRole: UserRole): boolean {
  return userRole === "ROOT_ADMIN";
}

/**
 * Role hierarchy helper
 * Returns true if user has equal or higher privileges than required role
 */
export function hasRoleOrHigher(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    EMPLOYEE: 1,
    ADMIN: 2,
    ROOT_ADMIN: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Get user permissions based on role
 */
export function getUserPermissions(role: UserRole) {
  const basePermissions = {
    canViewDashboard: true,
    canAccessProjects: false,
    canCreateProjects: false,
    canManageUsers: false,
    canAccessSystemSettings: false,
    canDeleteProjects: false,
  };

  switch (role) {
    case "ROOT_ADMIN":
      return {
        ...basePermissions,
        canAccessProjects: true,
        canCreateProjects: true,
        canManageUsers: true,
        canAccessSystemSettings: true,
        canDeleteProjects: true,
      };

    case "ADMIN":
      return {
        ...basePermissions,
        canAccessProjects: true,
        canCreateProjects: true,
        canManageUsers: true,
        canDeleteProjects: true,
      };

    case "EMPLOYEE":
      return {
        ...basePermissions,
        canAccessProjects: true, // Only projects they're assigned to
      };

    default:
      return basePermissions;
  }
}

/**
 * Session validation helper for API routes
 */
export async function validateApiSession() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return { error: "Authentication required", status: 401 } as const;
  }

  return { user: session.user, error: null, status: 200 } as const;
}

/**
 * Role validation helper for API routes
 */
export async function validateApiRole(requiredRole: UserRole | UserRole[]) {
  const sessionResult = await validateApiSession();

  if (sessionResult.error) {
    return sessionResult;
  }

  const allowedRoles = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];

  if (!allowedRoles.includes(sessionResult.user.role)) {
    return { error: "Insufficient permissions", status: 403 } as const;
  }

  return { user: sessionResult.user, error: null, status: 200 } as const;
}
