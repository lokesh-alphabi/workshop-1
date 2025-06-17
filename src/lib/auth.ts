import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { LoginSchema } from "./validation/auth";
import type { UserRole } from "@prisma/client";

/**
 * Account lockout configuration
 */
const ACCOUNT_LOCKOUT = {
  MAX_ATTEMPTS: 10,
  LOCKOUT_DURATION_HOURS: 1,
  RATE_LIMIT_WINDOW_MINUTES: 5,
  RATE_LIMIT_MAX_ATTEMPTS: 5,
} as const;

/**
 * Check if account is currently locked
 */
async function isAccountLocked(email: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { email },
    select: { lockedUntil: true, failedLoginAttempts: true },
  });

  if (!user) return false;

  // Check if account is currently locked
  if (user.lockedUntil && new Date() < user.lockedUntil) {
    return true;
  }

  // If lock has expired, reset the failed attempts
  if (user.lockedUntil && new Date() >= user.lockedUntil) {
    await db.user.update({
      where: { email },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  return false;
}

/**
 * Handle failed login attempt
 */
async function handleFailedLogin(email: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { email },
    select: { failedLoginAttempts: true },
  });

  if (!user) return;

  const newFailedAttempts = user.failedLoginAttempts + 1;
  const shouldLockAccount = newFailedAttempts >= ACCOUNT_LOCKOUT.MAX_ATTEMPTS;

  await db.user.update({
    where: { email },
    data: {
      failedLoginAttempts: newFailedAttempts,
      lockedUntil: shouldLockAccount
        ? new Date(
            Date.now() + ACCOUNT_LOCKOUT.LOCKOUT_DURATION_HOURS * 60 * 60 * 1000
          )
        : null,
    },
  });
}

/**
 * Handle successful login
 */
async function handleSuccessfulLogin(email: string): Promise<void> {
  await db.user.update({
    where: { email },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date(),
    },
  });
}

/**
 * Rate limiting store (in-memory for MVP, should use Redis in production)
 */
const rateLimitStore = new Map<
  string,
  { attempts: number; resetTime: number }
>();

/**
 * Simple rate limiting implementation
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `login_${ip}`;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, {
      attempts: 1,
      resetTime: now + ACCOUNT_LOCKOUT.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    });
    return true;
  }

  if (current.attempts >= ACCOUNT_LOCKOUT.RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  current.attempts++;
  rateLimitStore.set(key, current);
  return true;
}

/**
 * NextAuth.js configuration
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),

  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials, req) {
        try {
          // Validate input format
          const validatedFields = LoginSchema.safeParse(credentials);
          if (!validatedFields.success) {
            return null;
          }

          const { email, password } = validatedFields.data;

          // Rate limiting check
          const clientIP =
            req?.headers?.["x-forwarded-for"] ||
            req?.headers?.["x-real-ip"] ||
            req?.socket?.remoteAddress ||
            "unknown";

          if (!checkRateLimit(clientIP as string)) {
            console.warn(`Rate limit exceeded for IP: ${clientIP}`);
            return null;
          }

          // Check if account is locked
          if (await isAccountLocked(email)) {
            console.warn(`Login attempt on locked account: ${email}`);
            return null;
          }

          // Find user in database
          const user = await db.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              passwordHash: true,
              name: true,
              role: true,
              failedLoginAttempts: true,
              lockedUntil: true,
            },
          });

          // User doesn't exist - don't reveal this information
          if (!user) {
            // Still check rate limiting even for non-existent users
            await new Promise((resolve) => setTimeout(resolve, 100)); // Prevent timing attacks
            return null;
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash
          );

          if (!isPasswordValid) {
            await handleFailedLogin(email);
            return null;
          }

          // Successful authentication
          await handleSuccessfulLogin(email);

          // Return user object for session
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // Update session every hour
  },

  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  callbacks: {
    async jwt({ token, user }) {
      // Include user role in JWT token on sign in
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      // Include user role and id in session
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Ensure redirects stay within the application
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  events: {
    async signIn({ user, isNewUser }) {
      console.log(`User signed in: ${user.email} (New user: ${isNewUser})`);
    },

    async signOut({ token }) {
      console.log(`User signed out: ${token?.email}`);
    },
  },

  debug: process.env.NODE_ENV === "development",
};

/**
 * Type definitions for NextAuth
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
  }

  interface User {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    id: string;
  }
}
