import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectCreationSchema } from "@/lib/validation/projects";
import { ZodError } from "zod";

/**
 * POST /api/projects/create
 *
 * Creates a new project with comprehensive validation and security checks
 * Access: ROOT_ADMIN and ADMIN only
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Authorization check - only ROOT_ADMIN and ADMIN can create projects
    if (session.user.role !== "ROOT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = projectCreationSchema.parse(body);

    // Check if project name already exists (case-insensitive)
    const existingProject = await db.project.findFirst({
      where: {
        name: {
          equals: validatedData.name,
          mode: "insensitive",
        },
      },
    });

    if (existingProject) {
      return NextResponse.json(
        {
          error: "Project name already exists",
          field: "name",
          message:
            "A project with this name already exists. Please choose a different name.",
        },
        { status: 409 }
      );
    }

    // Validate date logic
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    if (startDate < now) {
      return NextResponse.json(
        {
          error: "Invalid start date",
          field: "startDate",
          message: "Start date cannot be in the past.",
        },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        {
          error: "Invalid end date",
          field: "endDate",
          message: "End date must be after the start date.",
        },
        { status: 400 }
      );
    }

    // Calculate project duration and validate reasonable timeframe
    const durationDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (durationDays > 1095) {
      // 3 years
      return NextResponse.json(
        {
          error: "Invalid project duration",
          field: "endDate",
          message: "Project duration cannot exceed 3 years.",
        },
        { status: 400 }
      );
    }

    // Create the project
    const project = await db.project.create({
      data: {
        name: validatedData.name.trim(),
        description: validatedData.description?.trim() || null,
        clientName: validatedData.clientName?.trim() || null,
        clientTeamMembers: validatedData.clientTeamMembers?.trim() || null,
        startDate: startDate,
        endDate: endDate,
        createdBy: session.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Log successful project creation for audit
    console.log(
      `Project created: ${project.name} by ${session.user.email} (${session.user.role})`
    );

    return NextResponse.json(
      {
        message: "Project created successfully",
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          clientName: project.clientName,
          clientTeamMembers: project.clientTeamMembers,
          startDate: project.startDate,
          endDate: project.endDate,
          creator: project.creator,
          createdAt: project.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Project creation error:", error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const fieldErrors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return NextResponse.json(
        {
          error: "Validation failed",
          fieldErrors,
        },
        { status: 400 }
      );
    }

    // Handle database errors
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        {
          error: "Project name already exists",
          field: "name",
          message: "A project with this name already exists.",
        },
        { status: 409 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { error: "An unexpected error occurred while creating the project" },
      { status: 500 }
    );
  }
}
