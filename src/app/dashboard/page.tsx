import { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export const metadata: Metadata = {
  title: "Dashboard | Project Management Tool",
  description: "Project management dashboard and overview",
};

/**
 * Dashboard Page
 * Requires authentication - displays user overview and navigation
 */
export default async function DashboardPage() {
  // Require authentication for this page
  const user = await requireAuth();

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name}
          </h1>
          <p className="text-gray-600">
            {`Here's your project management overview`}
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Account Information
          </h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === "ROOT_ADMIN"
                      ? "bg-purple-100 text-purple-800"
                      : user.role === "ADMIN"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {user.role}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">User ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {user.id}
              </dd>
            </div>
          </dl>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {user.role === "ROOT_ADMIN" && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">
                  System Management
                </h3>
                <p className="mt-1 text-sm text-purple-600">
                  Manage users, system settings, and global configuration
                </p>
              </div>
            )}

            {(user.role === "ROOT_ADMIN" || user.role === "ADMIN") && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">
                  Project Management
                </h3>
                <p className="mt-1 text-sm text-blue-600">
                  Create and manage projects, assign team members
                </p>
              </div>
            )}

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-800">
                My Projects
              </h3>
              <p className="mt-1 text-sm text-green-600">
                View and work on assigned projects and tasks
              </p>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            System Status
          </h2>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-green-400 rounded-full"></div>
            <span className="text-sm text-gray-600">
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
