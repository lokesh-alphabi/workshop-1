import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

/**
 * Rate limiting store for name checking
 * In production, this should use Redis or similar persistent store
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting configuration
 */
const RATE_LIMIT = {
  MAX_REQUESTS: 10, // Maximum requests per window
  WINDOW_MS: 60000, // 1 minute window
} as const;

/**
 * Check rate limit for name validation requests
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const key = `name_check_${userId}`;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT.WINDOW_MS,
    });
    return true;
  }

  if (current.count >= RATE_LIMIT.MAX_REQUESTS) {
    return false;
  }

  current.count++;
  rateLimitStore.set(key, current);
  return true;
}

/**
 * Query parameter validation schema
 */
const nameCheckSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(255, "Project name must be less than 255 characters")
    .transform((str) => str.trim()),
});

/**
 * GET /api/projects/check-name
 *
 * Checks if a project name is available (not already taken)
 * Access: ROOT_ADMIN and ADMIN only
 * Rate limited to prevent abuse
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Authorization check - only ROOT_ADMIN and ADMIN can check names
    if (session.user.role !== "ROOT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Rate limiting check
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Please wait before checking another name",
        },
        { status: 429 }
      );
    }

    // Extract and validate query parameters
    const { searchParams } = new URL(request.url);
    const nameParam = searchParams.get("name");

    if (!nameParam) {
      return NextResponse.json(
        {
          error: "Missing required parameter",
          message: "Project name is required",
        },
        { status: 400 }
      );
    }

    // Validate the name format
    const validationResult = nameCheckSchema.safeParse({ name: nameParam });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid project name",
          message: validationResult.error.errors[0].message,
        },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;

    // Check if name already exists (case-insensitive)
    const existingProject = await db.project.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const isAvailable = !existingProject;

    // Generate suggested alternatives if name is taken
    let suggestions: string[] = [];
    if (!isAvailable) {
      const baseName = name.toLowerCase();
      const currentYear = new Date().getFullYear();

      suggestions = [
        `${name} v2`,
        `${name} ${currentYear}`,
        `${name} - New`,
        `${name} Project`,
        `New ${name}`,
      ];

      // Filter out suggestions that might also exist
      const suggestionChecks = await Promise.all(
        suggestions.map(async (suggestion) => {
          const exists = await db.project.findFirst({
            where: {
              name: {
                equals: suggestion,
                mode: "insensitive",
              },
            },
          });
          return { suggestion, exists: !!exists };
        })
      );

      suggestions = suggestionChecks
        .filter((check) => !check.exists)
        .map((check) => check.suggestion)
        .slice(0, 3); // Limit to 3 suggestions
    }

    return NextResponse.json({
      available: isAvailable,
      name: name,
      message: isAvailable
        ? "Project name is available"
        : "Project name is already taken",
      ...(suggestions.length > 0 && { suggestions }),
    });
  } catch (error) {
    console.error("Name check error:", error);

    return NextResponse.json(
      {
        error: "Server error",
        message: "Unable to check name availability at this time",
      },
      { status: 500 }
    );
  }
}

/**
 * Clean up expired rate limit entries periodically
 * This should ideally be handled by a background job in production
 */
function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimit, 5 * 60 * 1000);
}
