"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
// Custom debounce implementation
import {
  CalendarIcon,
  CheckIcon,
  XIcon,
  LoaderIcon,
  AlertCircleIcon,
} from "lucide-react";
import { format } from "date-fns";

/**
 * Custom debounce function to avoid adding lodash dependency
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

import {
  projectCreationSchema,
  type ProjectCreationInput,
  PROJECT_FIELD_LIMITS,
} from "@/lib/validation/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Type for name availability checking
 */
type NameAvailability = {
  status: "idle" | "checking" | "available" | "taken" | "error";
  message?: string;
  suggestions?: string[];
};

/**
 * Type for form submission state
 */
type SubmissionState = {
  isSubmitting: boolean;
  error?: string;
  success?: boolean;
};

/**
 * ProjectCreationForm Component
 *
 * Comprehensive form for creating new projects with:
 * - Real-time validation
 * - Name uniqueness checking
 * - Accessible date pickers
 * - Auto-save functionality
 * - Loading states and error handling
 */
export function ProjectCreationForm() {
  const router = useRouter();

  // Form state management
  const [nameAvailability, setNameAvailability] = useState<NameAvailability>({
    status: "idle",
  });
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    isSubmitting: false,
  });
  const [isDirty, setIsDirty] = useState(false);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isValid, touchedFields },
  } = useForm<ProjectCreationInput>({
    resolver: zodResolver(projectCreationSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      clientName: "",
      clientTeamMembers: "",
      startDate: undefined,
      endDate: undefined,
    },
  });

  // Watch form values for real-time updates
  const watchedName = watch("name");
  const watchedDescription = watch("description");
  const watchedClientName = watch("clientName");
  const watchedClientTeamMembers = watch("clientTeamMembers");
  const watchedStartDate = watch("startDate");
  const watchedEndDate = watch("endDate");

  // Auto-save to localStorage
  useEffect(() => {
    const formData = getValues();
    const hasData = Object.values(formData).some(
      (value) => value !== undefined && value !== "" && value !== null
    );

    if (hasData && isDirty) {
      localStorage.setItem(
        "project-form-draft",
        JSON.stringify({
          ...formData,
          timestamp: Date.now(),
        })
      );
    }
  }, [
    watchedName,
    watchedDescription,
    watchedClientName,
    watchedClientTeamMembers,
    watchedStartDate,
    watchedEndDate,
    getValues,
    isDirty,
  ]);

  // Load saved form data on mount
  useEffect(() => {
    const saved = localStorage.getItem("project-form-draft");
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        const oneHourAgo = Date.now() - 60 * 60 * 1000;

        if (parsedData.timestamp > oneHourAgo) {
          // Restore form data
          Object.entries(parsedData).forEach(([key, value]) => {
            if (key !== "timestamp" && value !== undefined && value !== "") {
              setValue(key as keyof ProjectCreationInput, value as any);
            }
          });
        } else {
          // Clear old data
          localStorage.removeItem("project-form-draft");
        }
      } catch (error) {
        console.error("Error loading saved form data:", error);
        localStorage.removeItem("project-form-draft");
      }
    }
  }, [setValue]);

  // Debounced name availability checking
  const checkNameAvailability = useCallback(
    debounce(async (name: string) => {
      if (!name || name.length < 3) {
        setNameAvailability({ status: "idle" });
        return;
      }

      setNameAvailability({ status: "checking" });

      try {
        const response = await fetch(
          `/api/projects/check-name?name=${encodeURIComponent(name)}`
        );
        const data = await response.json();

        if (response.ok) {
          setNameAvailability({
            status: data.available ? "available" : "taken",
            message: data.message,
            suggestions: data.suggestions,
          });

          if (!data.available) {
            setError("name", {
              type: "manual",
              message: data.message || "This project name is already taken",
            });
          } else {
            clearErrors("name");
          }
        } else if (response.status === 429) {
          setNameAvailability({
            status: "error",
            message:
              "Too many requests. Please wait before checking another name.",
          });
        } else {
          throw new Error(data.message || "Failed to check name availability");
        }
      } catch (error) {
        console.error("Name availability check failed:", error);
        setNameAvailability({
          status: "error",
          message: "Unable to check name availability",
        });
      }
    }, 500),
    [setError, clearErrors]
  );

  // Check name availability when name changes
  useEffect(() => {
    if (watchedName && watchedName.length >= 3) {
      setIsDirty(true);
      checkNameAvailability(watchedName);
    } else {
      setNameAvailability({ status: "idle" });
    }
  }, [watchedName, checkNameAvailability]);

  // Mark form as dirty when any field changes
  useEffect(() => {
    if (
      watchedDescription ||
      watchedClientName ||
      watchedClientTeamMembers ||
      watchedStartDate ||
      watchedEndDate
    ) {
      setIsDirty(true);
    }
  }, [
    watchedDescription,
    watchedClientName,
    watchedClientTeamMembers,
    watchedStartDate,
    watchedEndDate,
  ]);

  // Handle form submission
  const onSubmit = async (data: ProjectCreationInput) => {
    setSubmissionState({ isSubmitting: true, error: undefined });

    // Preprocess data to convert empty strings to undefined for optional fields
    const processedData = {
      ...data,
      description: data.description?.trim() || undefined,
      clientName: data.clientName?.trim() || undefined,
      clientTeamMembers: data.clientTeamMembers?.trim() || undefined,
    };

    try {
      const response = await fetch("/api/projects/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedData),
      });

      const result = await response.json();

      if (response.ok) {
        // Clear saved form data
        localStorage.removeItem("project-form-draft");

        setSubmissionState({
          isSubmitting: false,
          success: true,
        });

        // Redirect to project page after short delay
        setTimeout(() => {
          router.push(`/projects/${result.project.id}`);
        }, 1500);
      } else {
        // Handle field-specific errors
        if (result.fieldErrors) {
          result.fieldErrors.forEach(
            (fieldError: { field: string; message: string }) => {
              setError(fieldError.field as keyof ProjectCreationInput, {
                type: "manual",
                message: fieldError.message,
              });
            }
          );
        }

        setSubmissionState({
          isSubmitting: false,
          error: result.message || "Failed to create project",
        });
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmissionState({
        isSubmitting: false,
        error: "An unexpected error occurred. Please try again.",
      });
    }
  };

  // Character count helper
  const getCharacterCount = (value: string | undefined, limit: number) => {
    const count = value?.length || 0;
    const isNearLimit = count > limit * 0.8;
    const isOverLimit = count > limit;

    return {
      count,
      limit,
      isNearLimit,
      isOverLimit,
      className: cn(
        "text-xs",
        isOverLimit
          ? "text-destructive"
          : isNearLimit
          ? "text-yellow-600"
          : "text-muted-foreground"
      ),
    };
  };

  // Name availability indicator
  const NameAvailabilityIndicator = () => {
    if (
      nameAvailability.status === "idle" ||
      !watchedName ||
      watchedName.length < 3
    ) {
      return null;
    }

    const icons = {
      checking: <LoaderIcon className="h-4 w-4 animate-spin" />,
      available: <CheckIcon className="h-4 w-4 text-green-600" />,
      taken: <XIcon className="h-4 w-4 text-destructive" />,
      error: <AlertCircleIcon className="h-4 w-4 text-yellow-600" />,
    };

    return (
      <div className="flex items-center gap-2 mt-1">
        {icons[nameAvailability.status]}
        <span
          className={cn(
            "text-xs",
            nameAvailability.status === "available" && "text-green-600",
            nameAvailability.status === "taken" && "text-destructive",
            nameAvailability.status === "error" && "text-yellow-600"
          )}
        >
          {nameAvailability.message}
        </span>
      </div>
    );
  };

  // Success state
  if (submissionState.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckIcon className="h-12 w-12 text-green-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          Project Created Successfully!
        </h3>
        <p className="text-muted-foreground">
          Redirecting to your new project...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Information Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Basic Information</h3>
          <p className="text-sm text-muted-foreground">
            Essential details about your project.
          </p>
        </div>

        {/* Project Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Project Name *
          </Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="e.g., Website Redesign 2024"
            className={cn(
              errors.name && "border-destructive",
              nameAvailability.status === "available" && "border-green-600",
              nameAvailability.status === "taken" && "border-destructive"
            )}
          />
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
              <NameAvailabilityIndicator />
              {nameAvailability.suggestions &&
                nameAvailability.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      Suggestions:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {nameAvailability.suggestions.map((suggestion, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer text-xs"
                          onClick={() => {
                            setValue("name", suggestion);
                            checkNameAvailability(suggestion);
                          }}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </div>
            <span
              className={
                getCharacterCount(watchedName, PROJECT_FIELD_LIMITS.name)
                  .className
              }
            >
              {getCharacterCount(watchedName, PROJECT_FIELD_LIMITS.name).count}/
              {PROJECT_FIELD_LIMITS.name}
            </span>
          </div>
        </div>

        {/* Project Description Field */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Describe the project goals, scope, and key deliverables..."
            className={cn(
              "min-h-[120px] resize-none",
              errors.description && "border-destructive"
            )}
          />
          <div className="flex justify-between items-center">
            <div>
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
            <span
              className={
                getCharacterCount(
                  watchedDescription,
                  PROJECT_FIELD_LIMITS.description
                ).className
              }
            >
              {
                getCharacterCount(
                  watchedDescription,
                  PROJECT_FIELD_LIMITS.description
                ).count
              }
              /{PROJECT_FIELD_LIMITS.description}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Client Information Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Client Information</h3>
          <p className="text-sm text-muted-foreground">
            Optional details about the client and their team.
          </p>
        </div>

        {/* Client Name Field */}
        <div className="space-y-2">
          <Label htmlFor="clientName" className="text-sm font-medium">
            Client Name
          </Label>
          <Input
            id="clientName"
            {...register("clientName")}
            placeholder="e.g., Acme Corporation"
            className={cn(errors.clientName && "border-destructive")}
          />
          <div className="flex justify-between items-center">
            <div>
              {errors.clientName && (
                <p className="text-xs text-destructive">
                  {errors.clientName.message}
                </p>
              )}
            </div>
            <span
              className={
                getCharacterCount(
                  watchedClientName,
                  PROJECT_FIELD_LIMITS.clientName
                ).className
              }
            >
              {
                getCharacterCount(
                  watchedClientName,
                  PROJECT_FIELD_LIMITS.clientName
                ).count
              }
              /{PROJECT_FIELD_LIMITS.clientName}
            </span>
          </div>
        </div>

        {/* Client Team Members Field */}
        <div className="space-y-2">
          <Label htmlFor="clientTeamMembers" className="text-sm font-medium">
            Client Team Members
          </Label>
          <Textarea
            id="clientTeamMembers"
            {...register("clientTeamMembers")}
            placeholder="List key client contacts and their roles..."
            className={cn(
              "min-h-[80px] resize-none",
              errors.clientTeamMembers && "border-destructive"
            )}
          />
          <div className="flex justify-between items-center">
            <div>
              {errors.clientTeamMembers && (
                <p className="text-xs text-destructive">
                  {errors.clientTeamMembers.message}
                </p>
              )}
            </div>
            <span
              className={
                getCharacterCount(
                  watchedClientTeamMembers,
                  PROJECT_FIELD_LIMITS.clientTeamMembers
                ).className
              }
            >
              {
                getCharacterCount(
                  watchedClientTeamMembers,
                  PROJECT_FIELD_LIMITS.clientTeamMembers
                ).count
              }
              /{PROJECT_FIELD_LIMITS.clientTeamMembers}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Project Timeline Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Project Timeline</h3>
          <p className="text-sm text-muted-foreground">
            Define the project start and end dates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Start Date Field */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Start Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watchedStartDate && "text-muted-foreground",
                    errors.startDate && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedStartDate
                    ? format(watchedStartDate, "PPP")
                    : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchedStartDate}
                  onSelect={(date) => {
                    if (date) {
                      setValue("startDate", date, { shouldValidate: true });
                    }
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.startDate && (
              <p className="text-xs text-destructive">
                {errors.startDate.message}
              </p>
            )}
          </div>

          {/* End Date Field */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">End Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watchedEndDate && "text-muted-foreground",
                    errors.endDate && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedEndDate
                    ? format(watchedEndDate, "PPP")
                    : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchedEndDate}
                  onSelect={(date) => {
                    if (date) {
                      setValue("endDate", date, { shouldValidate: true });
                    }
                  }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (date < today) return true;
                    if (watchedStartDate && watchedStartDate instanceof Date) {
                      return date <= watchedStartDate;
                    }
                    return false;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.endDate && (
              <p className="text-xs text-destructive">
                {errors.endDate.message}
              </p>
            )}
          </div>
        </div>

        {/* Project Duration Display */}
        {watchedStartDate &&
          watchedEndDate &&
          watchedStartDate instanceof Date &&
          watchedEndDate instanceof Date && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Project Duration</p>
              <p className="text-sm text-muted-foreground">
                {(() => {
                  try {
                    const startDate = new Date(watchedStartDate);
                    const endDate = new Date(watchedEndDate);
                    const durationDays = Math.ceil(
                      (endDate.getTime() - startDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    return `${durationDays} days`;
                  } catch (error) {
                    return "Calculating...";
                  }
                })()}
              </p>
            </div>
          )}
      </div>

      {/* Error Display */}
      {submissionState.error && (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>{submissionState.error}</AlertDescription>
        </Alert>
      )}

      {/* Debug Information - Remove in production */}
      {process.env.NODE_ENV === "development" && (
        <div className="p-4 bg-gray-50 rounded-lg text-xs">
          <p>
            <strong>Form Valid:</strong> {isValid ? "Yes" : "No"}
          </p>
          <p>
            <strong>Name Status:</strong> {nameAvailability.status}
          </p>
          <p>
            <strong>Submitting:</strong>{" "}
            {submissionState.isSubmitting ? "Yes" : "No"}
          </p>
          {Object.keys(errors).length > 0 && (
            <details className="mt-2">
              <summary>
                <strong>Validation Errors:</strong>
              </summary>
              <pre className="mt-1 text-red-600">
                {JSON.stringify(errors, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submissionState.isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            !isValid ||
            submissionState.isSubmitting ||
            nameAvailability.status === "taken"
          }
          className="min-w-[120px]"
        >
          {submissionState.isSubmitting ? (
            <>
              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Project"
          )}
        </Button>
      </div>
    </form>
  );
}
