import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { performance } from "perf_hooks";

const prisma = new PrismaClient();

/**
 * Environment configuration
 */
const config = {
  environment: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  adminEmail: process.env.ROOT_ADMIN_EMAIL || "admin@company.com",
  minPasswordLength: 16,
  saltRounds: 12,
  maxRetries: 3,
};

/**
 * Seed execution metadata
 */
interface SeedExecutionLog {
  timestamp: string;
  environment: string;
  success: boolean;
  executionTimeMs: number;
  action: "create" | "skip" | "error";
  details?: string;
  error?: string;
}

/**
 * Enhanced secure password generation with guaranteed character requirements
 * Ensures at least one character from each required category
 */
function generateSecurePassword(): string {
  const length = Math.max(config.minPasswordLength, 16);

  // Character sets for different requirements
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  // Ensure at least one character from each category
  let password = "";
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += symbols[crypto.randomInt(0, symbols.length)];

  // Fill remaining positions with random characters from all sets
  const allChars = uppercase + lowercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }

  // Shuffle the password to randomize position of guaranteed characters
  return password
    .split("")
    .sort(() => crypto.randomInt(0, 3) - 1)
    .join("");
}

/**
 * Validate password meets security requirements
 */
function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < config.minPasswordLength) {
    errors.push(
      `Password must be at least ${config.minPasswordLength} characters long`
    );
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Log seed execution for audit purposes
 */
async function logSeedExecution(log: SeedExecutionLog): Promise<void> {
  const logEntry = {
    ...log,
    nodeVersion: process.version,
    platform: process.platform,
    databaseUrl: process.env.DATABASE_URL ? "[CONFIGURED]" : "[NOT SET]",
  };

  // In production, you might want to send this to a logging service
  if (config.isProduction) {
    console.log("📊 AUDIT LOG:", JSON.stringify(logEntry, null, 2));
  } else {
    console.log("📝 Seed execution logged:", {
      action: log.action,
      success: log.success,
      executionTime: `${log.executionTimeMs}ms`,
      environment: log.environment,
    });
  }
}

/**
 * Verify database schema compatibility
 */
async function verifySchemaCompatibility(): Promise<void> {
  try {
    // Check if required tables exist with expected structure
    const userCount = await prisma.user.count();
    console.log(`✅ Database schema verified (${userCount} existing users)`);
  } catch (error) {
    throw new Error(
      `Database schema incompatible. Please run migrations first: npm run db:migrate\nError: ${error}`
    );
  }
}

/**
 * Verify database connectivity with retry logic
 */
async function verifyDatabaseConnection(): Promise<void> {
  let retries = 0;

  while (retries < config.maxRetries) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log("✅ Database connection verified");
      return;
    } catch (error) {
      retries++;
      console.warn(
        `⚠️  Database connection attempt ${retries}/${config.maxRetries} failed`
      );

      if (retries === config.maxRetries) {
        throw new Error(
          `Database connection failed after ${config.maxRetries} attempts. ` +
            "Please check your DATABASE_URL environment variable and ensure PostgreSQL is running."
        );
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, retries) * 1000)
      );
    }
  }
}

/**
 * Check if Root Admin already exists
 */
async function checkExistingRootAdmin(): Promise<any | null> {
  return await prisma.user.findFirst({
    where: {
      role: UserRole.ROOT_ADMIN,
      email: config.adminEmail,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      lastLogin: true,
      failedLoginAttempts: true,
    },
  });
}

/**
 * Request confirmation for production environment
 */
async function requestProductionConfirmation(): Promise<boolean> {
  if (!config.isProduction) return true;

  console.log("🚨 PRODUCTION ENVIRONMENT DETECTED");
  console.log("⚠️  You are about to create a Root Admin account in PRODUCTION");
  console.log(
    "   This action should only be performed during initial system setup."
  );
  console.log("");

  // In a real deployment, you might want to require additional confirmation
  // For now, we'll proceed with a warning
  console.log("✅ Proceeding with Root Admin creation...");
  return true;
}

/**
 * Create Root Admin account with transaction safety
 */
async function createRootAdmin(): Promise<{ user: any; password: string }> {
  return await prisma.$transaction(async (tx) => {
    // Double-check within transaction to prevent race conditions
    const existingAdmin = await tx.user.findFirst({
      where: {
        role: UserRole.ROOT_ADMIN,
        email: config.adminEmail,
      },
    });

    if (existingAdmin) {
      throw new Error(
        "Root Admin account created by another process during execution"
      );
    }

    // Generate and validate password
    let password: string;
    let attempts = 0;
    const maxPasswordAttempts = 10;

    do {
      password = generateSecurePassword();
      attempts++;

      if (attempts > maxPasswordAttempts) {
        throw new Error(
          "Failed to generate valid password after multiple attempts"
        );
      }
    } while (!validatePassword(password).valid);

    console.log("🔐 Generated secure password meeting all requirements");

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, config.saltRounds);
    console.log(
      `🔒 Password hashed with bcrypt (${config.saltRounds} salt rounds)`
    );

    // Create Root Admin user
    const rootAdmin = await tx.user.create({
      data: {
        email: config.adminEmail,
        passwordHash: passwordHash,
        role: UserRole.ROOT_ADMIN,
        name: "System Administrator",
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

    return { user: rootAdmin, password };
  });
}

/**
 * Display credentials with security warnings
 */
function displayCredentials(user: any, password: string): void {
  console.log("");
  console.log("🔑 ===============================================");
  console.log("   ROOT ADMIN CREDENTIALS - SAVE SECURELY");
  console.log("===============================================");
  console.log(`📧 Email:      ${user.email}`);
  console.log(`🔐 Password:   ${password}`);
  console.log(`🆔 User ID:    ${user.id}`);
  console.log(`👤 Name:       ${user.name}`);
  console.log(`🛡️  Role:       ${user.role}`);
  console.log(`🕒 Created:    ${user.createdAt.toISOString()}`);
  console.log(`🌍 Environment: ${config.environment.toUpperCase()}`);
  console.log("===============================================");
  console.log("");
  console.log("🚨 CRITICAL SECURITY NOTICE:");
  console.log("   • This password will NEVER be displayed again");
  console.log("   • Store these credentials in a secure password manager");
  console.log("   • Change the password after first login");
  console.log("   • Do not share these credentials via insecure channels");
  console.log("   • Enable 2FA after initial setup (when available)");
  console.log("");

  if (config.isProduction) {
    console.log("🔒 PRODUCTION SECURITY REMINDERS:");
    console.log("   • Rotate this password within 24 hours");
    console.log("   • Review and enable all security features");
    console.log("   • Monitor access logs for this account");
    console.log("   • Restrict network access to admin functions");
    console.log("");
  }
}

/**
 * Display existing Root Admin information
 */
function displayExistingAdmin(admin: any): void {
  console.log("✅ Root Admin account already exists");
  console.log("");
  console.log("📋 Existing Account Information:");
  console.log(`📧 Email:      ${admin.email}`);
  console.log(`👤 Name:       ${admin.name}`);
  console.log(`🛡️  Role:       ${admin.role}`);
  console.log(`🆔 User ID:    ${admin.id}`);
  console.log(`🕒 Created:    ${admin.createdAt.toISOString()}`);
  console.log(
    `🔓 Last Login: ${
      admin.lastLogin ? admin.lastLogin.toISOString() : "Never"
    }`
  );
  console.log(`❌ Failed Attempts: ${admin.failedLoginAttempts}`);
  console.log("");
  console.log(
    "💡 If you need to reset the password, use the user management system"
  );
  console.log("   or contact your system administrator.");
}

/**
 * Seed the database with the initial Root Admin account
 * This function is idempotent - can be run multiple times safely
 */
async function seedRootAdmin(): Promise<SeedExecutionLog> {
  const startTime = performance.now();

  try {
    console.log("🌱 Starting Root Admin account verification/creation...");
    console.log(`🌍 Environment: ${config.environment}`);
    console.log(`📧 Admin Email: ${config.adminEmail}`);

    // Check if Root Admin already exists
    const existingAdmin = await checkExistingRootAdmin();

    if (existingAdmin) {
      displayExistingAdmin(existingAdmin);

      const executionTime = performance.now() - startTime;
      return {
        timestamp: new Date().toISOString(),
        environment: config.environment,
        success: true,
        executionTimeMs: Math.round(executionTime),
        action: "skip",
        details: `Root Admin ${config.adminEmail} already exists`,
      };
    }

    // Request confirmation for production
    const confirmed = await requestProductionConfirmation();
    if (!confirmed) {
      throw new Error("Root Admin creation cancelled by user");
    }

    // Create Root Admin account
    console.log("🔨 Creating Root Admin account...");
    const { user, password } = await createRootAdmin();

    console.log("✅ Root Admin account created successfully!");
    displayCredentials(user, password);

    const executionTime = performance.now() - startTime;
    return {
      timestamp: new Date().toISOString(),
      environment: config.environment,
      success: true,
      executionTimeMs: Math.round(executionTime),
      action: "create",
      details: `Root Admin ${user.email} created with ID ${user.id}`,
    };
  } catch (error) {
    const executionTime = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("❌ Error during Root Admin seed:", errorMessage);

    return {
      timestamp: new Date().toISOString(),
      environment: config.environment,
      success: false,
      executionTimeMs: Math.round(executionTime),
      action: "error",
      error: errorMessage,
    };
  }
}

/**
 * Cleanup function for emergency situations
 */
async function cleanup(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log("🧹 Database connection closed");
  } catch (error) {
    console.error("⚠️  Error during cleanup:", error);
  }
}

/**
 * Main seed function with comprehensive error handling
 */
async function main() {
  let seedLog: SeedExecutionLog | null = null;

  try {
    console.log("🚀 Project Management Tool - Root Admin Seed");
    console.log("===============================================");
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🔧 Node.js: ${process.version}`);
    console.log(`🖥️  Platform: ${process.platform}`);

    // Verify database connectivity
    await verifyDatabaseConnection();

    // Verify schema compatibility
    await verifySchemaCompatibility();

    // Seed Root Admin account
    seedLog = await seedRootAdmin();

    // Log execution for audit
    await logSeedExecution(seedLog);

    if (seedLog.success) {
      console.log("🎉 Root Admin seed completed successfully!");
      if (seedLog.action === "create") {
        console.log("");
        console.log("🚀 Next Steps:");
        console.log("   1. Save the displayed credentials securely");
        console.log("   2. Start the application: npm run dev");
        console.log("   3. Visit http://localhost:3000");
        console.log("   4. Sign in with the Root Admin credentials");
        console.log("   5. Change the password after first login");
      }
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 Critical error during seed process:", error);

    if (!seedLog) {
      seedLog = {
        timestamp: new Date().toISOString(),
        environment: config.environment,
        success: false,
        executionTimeMs: 0,
        action: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }

    await logSeedExecution(seedLog);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Handle process termination gracefully
process.on("SIGINT", async () => {
  console.log("\n🛑 Received interrupt signal, cleaning up...");
  await cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received termination signal, cleaning up...");
  await cleanup();
  process.exit(0);
});

// Execute seed script
main();
