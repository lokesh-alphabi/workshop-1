import { z } from "zod";

/**
 * User role validation schema
 * Matches the UserRole enum in Prisma schema
 */
export const UserRoleSchema = z.enum(["ROOT_ADMIN", "ADMIN", "EMPLOYEE"], {
  errorMap: () => ({ message: "Role must be ROOT_ADMIN, ADMIN, or EMPLOYEE" }),
});

/**
 * Project role validation schema
 * Matches the ProjectRole enum in Prisma schema
 */
export const ProjectRoleSchema = z.enum(
  ["OWNER", "MANAGER", "DEVELOPER", "TESTER"],
  {
    errorMap: () => ({
      message: "Project role must be OWNER, MANAGER, DEVELOPER, or TESTER",
    }),
  }
);

/**
 * User registration/creation validation schema
 * Used for creating new users by Admin/Root Admin
 */
export const CreateUserSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase()
    .trim(),

  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be less than 255 characters")
    .trim(),

  role: UserRoleSchema,

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});

/**
 * User login validation schema
 * Used for authentication requests
 */
export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password is too long"),
});

/**
 * Password change validation schema
 * For future implementation when password changes are supported
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),

    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128, "New password must be less than 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),

    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * User update validation schema
 * For updating user profile information
 */
export const UpdateUserSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(255, "Name must be less than 255 characters")
      .trim()
      .optional(),

    role: UserRoleSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/**
 * Email validation schema
 * Standalone email validation for various use cases
 */
export const EmailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(255, "Email must be less than 255 characters")
  .toLowerCase()
  .trim();

/**
 * Employee creation schema (simplified for admin use)
 * Only creates employees, role is automatically set
 */
export const CreateEmployeeSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase()
    .trim(),

  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be less than 255 characters")
    .trim(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters"),
});

// Type exports for TypeScript integration
export type UserRole = z.infer<typeof UserRoleSchema>;
export type ProjectRole = z.infer<typeof ProjectRoleSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type CreateEmployee = z.infer<typeof CreateEmployeeSchema>;
export type LoginCredentials = z.infer<typeof LoginSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
