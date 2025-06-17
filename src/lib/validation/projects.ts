import { z } from "zod";

/**
 * Project creation validation schema
 *
 * Comprehensive validation for all project fields with proper error messages
 * and business logic constraints
 */
export const projectCreationSchema = z
  .object({
    /**
     * Project Name - Required field with character limits and format validation
     */
    name: z
      .string()
      .min(3, "Project name must be at least 3 characters long")
      .max(100, "Project name must be less than 100 characters")
      .regex(
        /^[a-zA-Z0-9\s\-_\.]+$/,
        "Project name can only contain letters, numbers, spaces, hyphens, underscores, and periods"
      )
      .transform((str) => str.trim())
      .refine(
        (val) => val.length >= 3,
        "Project name must be at least 3 characters after trimming whitespace"
      ),

    /**
     * Project Description - Optional field with character limit
     */
    description: z
      .string()
      .max(2000, "Description must be less than 2000 characters")
      .transform((str) => {
        const trimmed = str.trim();
        return trimmed === "" ? undefined : trimmed;
      })
      .optional(),

    /**
     * Client Name - Optional field with character limit
     */
    clientName: z
      .string()
      .max(255, "Client name must be less than 255 characters")
      .transform((str) => {
        const trimmed = str.trim();
        return trimmed === "" ? undefined : trimmed;
      })
      .optional(),

    /**
     * Client Team Members - Optional field with character limit
     */
    clientTeamMembers: z
      .string()
      .max(1000, "Client team members must be less than 1000 characters")
      .transform((str) => {
        const trimmed = str.trim();
        return trimmed === "" ? undefined : trimmed;
      })
      .optional(),

    /**
     * Start Date - Required field with business logic validation
     */
    startDate: z.coerce.date({
      required_error: "Start date is required",
      invalid_type_error: "Please enter a valid start date",
    }),

    /**
     * End Date - Required field with business logic validation
     */
    endDate: z.coerce.date({
      required_error: "End date is required",
      invalid_type_error: "Please enter a valid end date",
    }),
  })
  .superRefine((data, ctx) => {
    // Advanced date validation that requires both dates to be present
    if (data.startDate && data.endDate) {
      // Create date objects for comparison (ignore time)
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const now = new Date();

      // Reset time components for accurate date comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);

      // Start date cannot be in the past
      if (startDate < now) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start date cannot be in the past",
          path: ["startDate"],
        });
      }

      // End date must be after start date
      if (endDate <= startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date must be after the start date",
          path: ["endDate"],
        });
      }

      // Project duration validation (reasonable timeframe)
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

      if (durationDays > 1095) {
        // 3 years
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Project duration cannot exceed 3 years",
          path: ["endDate"],
        });
      }

      if (durationDays < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Project must be at least 1 day long",
          path: ["endDate"],
        });
      }
    }
  });

/**
 * Type inference for TypeScript
 */
export type ProjectCreationInput = z.infer<typeof projectCreationSchema>;

/**
 * Schema for project name checking (used in API)
 */
export const projectNameCheckSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters")
    .transform((str) => str.trim()),
});

export type ProjectNameCheckInput = z.infer<typeof projectNameCheckSchema>;

/**
 * Validation helper for form field validation
 * Returns user-friendly error message for the first validation error
 */
export function validateProjectField(
  field: keyof ProjectCreationInput,
  value: any
): string | null {
  try {
    switch (field) {
      case "name":
        projectCreationSchema.shape.name.parse(value);
        break;
      case "description":
        projectCreationSchema.shape.description.parse(value);
        break;
      case "clientName":
        projectCreationSchema.shape.clientName.parse(value);
        break;
      case "clientTeamMembers":
        projectCreationSchema.shape.clientTeamMembers.parse(value);
        break;
      case "startDate":
        projectCreationSchema.shape.startDate.parse(value);
        break;
      case "endDate":
        projectCreationSchema.shape.endDate.parse(value);
        break;
      default:
        return null;
    }
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || "Invalid value";
    }
    return "Invalid value";
  }
}

/**
 * Character count helpers for form UI
 */
export const PROJECT_FIELD_LIMITS = {
  name: 100,
  description: 2000,
  clientName: 255,
  clientTeamMembers: 1000,
} as const;

/**
 * Format validation helpers
 */
export const PROJECT_VALIDATION_RULES = {
  name: {
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_\.]+$/,
    patternMessage:
      "Only letters, numbers, spaces, hyphens, underscores, and periods are allowed",
  },
  description: {
    maxLength: 2000,
  },
  clientName: {
    maxLength: 255,
  },
  clientTeamMembers: {
    maxLength: 1000,
  },
} as const;
