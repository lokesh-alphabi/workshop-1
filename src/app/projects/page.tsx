import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

/**
 * Projects Listing Page
 *
 * Shows all projects with conditional "Create Project" access
 * for ROOT_ADMIN and ADMIN users
 */
export default async function ProjectsPage() {
  // Server-side authentication check
  const session = await getServerSession(authOptions);

  // Redirect unauthenticated users to sign in
  if (!session) {
    redirect("/auth/signin?callbackUrl=/projects");
  }

  // Check if user can create projects (ROOT_ADMIN or ADMIN)
  const canCreateProjects =
    session.user.role === "ROOT_ADMIN" || session.user.role === "ADMIN";

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage your projects and track progress across teams.
          </p>
        </div>

        {/* Conditional Create Project Button */}
        {canCreateProjects && (
          <Link href="/projects/create">
            <Button className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Create Project
            </Button>
          </Link>
        )}
      </div>

      {/* Projects Content */}
      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>
            {canCreateProjects
              ? "Create and manage projects for your organization."
              : "View projects you have access to."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <PlusIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              {canCreateProjects
                ? "Get started by creating your first project. Set up timelines, assign team members, and track progress."
                : "No projects have been created yet. Contact your administrator to create new projects."}
            </p>
            {canCreateProjects && (
              <Link href="/projects/create">
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Metadata for the page
 */
export const metadata = {
  title: "Projects | Workshop",
  description: "Manage your projects and track progress across teams",
};
