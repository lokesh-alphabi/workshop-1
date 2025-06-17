import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * NextAuth.js API routes handler
 * Handles all authentication endpoints: /api/auth/*
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
