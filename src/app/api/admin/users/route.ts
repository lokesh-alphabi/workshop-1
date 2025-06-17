import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateEmployeeSchema } from "@/lib/validation/auth";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { ZodError } from "zod";

/**
 * Create a new employee user (Admin/Root Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only ROOT_ADMIN and ADMIN can create users
    if (session.user.role !== "ROOT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateEmployeeSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

    // Create the user
    const newUser = await db.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        name: validatedData.name,
        role: UserRole.EMPLOYEE, // New users are always employees
        failedLoginAttempts: 0,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Log the user creation for audit
    console.log(`User created by ${session.user.email}:`, {
      newUserId: newUser.id,
      newUserEmail: newUser.email,
      createdBy: session.user.email,
      createdByRole: session.user.role,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        message: "Employee account created successfully",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get all users (Admin/Root Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only ROOT_ADMIN and ADMIN can view all users
    if (session.user.role !== "ROOT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const role = searchParams.get("role") as UserRole | null;
    const search = searchParams.get("search") || "";

    // Build where clause
    const whereClause: any = {};

    if (role) {
      whereClause.role = role;
    }

    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count for pagination
    const total = await db.user.count({ where: whereClause });

    // Get users with pagination
    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLogin: true,
        failedLoginAttempts: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
