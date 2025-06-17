import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProjectCreationForm } from "@/components/projects/project-creation-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Project Creation Page
 *
 * Access Control: Only ROOT_ADMIN and ADMIN users can access this page
 * Implements server-side route protection as primary security layer
 */
export default async function CreateProjectPage() {
  // Server-side authentication and authorization check
  const session = await getServerSession(authOptions);

  // Redirect unauthenticated users to sign in
  if (!session) {
    redirect("/auth/signin?callbackUrl=/projects/create");
  }

  // Check if user has required role (ROOT_ADMIN or ADMIN)
  const hasPermission =
    session.user.role === "ROOT_ADMIN" || session.user.role === "ADMIN";

  if (!hasPermission) {
    redirect("/unauthorized");
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Create New Project
        </h1>
        <p className="text-muted-foreground mt-2">
          Set up a new project with client information, timeline, and team
          assignments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Fill out the information below to create your project. All fields
            marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }
          >
            <ProjectCreationForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Metadata for the page
 */
export const metadata = {
  title: "Create Project | Workshop",
  description: "Create a new project with timeline and client information",
};
