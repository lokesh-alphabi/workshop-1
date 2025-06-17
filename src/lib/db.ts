import {
  Priority,
  PrismaClient,
  ProjectRole,
  WorkItemStatus,
  UserRole,
  WorkItemType,
} from "@prisma/client";

/**
 * Global Prisma client instance
 * Ensures single instance across the application in development
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma client configuration
 * Optimized for Next.js development and production environments
 */
const createPrismaClient = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    errorFormat: "pretty",
  });
};

/**
 * Database client instance
 * Uses singleton pattern to prevent multiple connections in development
 */
export const db = globalForPrisma.prisma ?? createPrismaClient();

// Prevent multiple instances in development hot reloading
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

/**
 * Database connection health check
 * Verifies database connectivity
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.$connect();
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

/**
 * Graceful database disconnection
 * Should be called when shutting down the application
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await db.$disconnect();
    console.log("Database disconnected successfully");
  } catch (error) {
    console.error("Error disconnecting from database:", error);
  }
}

/**
 * Database transaction helper
 * Provides a clean interface for database transactions
 */
export async function withTransaction<T>(
  callback: (
    prisma: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >
  ) => Promise<T>
): Promise<T> {
  return await db.$transaction(callback);
}

// Export Prisma types for use throughout the application
export type {
  User,
  UserRole,
  Project,
  ProjectRole,
  ProjectMember,
  WorkItem,
  WorkItemType,
  Priority,
  WorkItemStatus,
  Sprint,
} from "@prisma/client";

// Export commonly used types with relations
export type UserWithProjects = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  projectMemberships: {
    id: string;
    role: ProjectRole;
    project: {
      id: string;
      name: string;
    };
  }[];
};

export type ProjectWithMembers = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  members: {
    id: string;
    role: ProjectRole;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }[];
};

export type WorkItemWithDetails = {
  id: string;
  title: string;
  description: string | null;
  type: WorkItemType;
  priority: Priority;
  status: WorkItemStatus;
  storyPoints: number | null;
  createdAt: Date;
  updatedAt: Date;
  assignee: {
    id: string;
    name: string;
    email: string;
  };
  accountable?: {
    id: string;
    name: string;
    email: string;
  } | null;
  project: {
    id: string;
    name: string;
  };
  sprint?: {
    id: string;
    name: string;
  } | null;
  parent?: {
    id: string;
    title: string;
    type: WorkItemType;
  } | null;
  children: {
    id: string;
    title: string;
    type: WorkItemType;
    status: WorkItemStatus;
  }[];
};
