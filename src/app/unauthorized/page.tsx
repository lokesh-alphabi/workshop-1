import { Metadata } from "next";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth-utils";

export const metadata: Metadata = {
  title: "Unauthorized | Project Management Tool",
  description: "You do not have permission to access this resource",
};

/**
 * Unauthorized Access Page
 * Displayed when user tries to access a resource without sufficient permissions
 */
export default async function UnauthorizedPage() {
  const session = await getCurrentSession();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-yellow-100">
            <svg
              className="h-8 w-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H10m9-6.5V10a7 7 0 00-14 0v1.5M12 3v2"
              />
            </svg>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Denied
          </h1>

          <p className="mt-4 text-lg text-gray-600">
            You don't have permission to access this resource.
          </p>

          {session?.user && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <p className="text-sm text-gray-700">
                <strong>Current Role:</strong> {session.user.role}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Email:</strong> {session.user.email}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {session?.user ? (
            <Link
              href="/dashboard"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Dashboard
            </Link>
          ) : (
            <Link
              href="/auth/signin"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In
            </Link>
          )}

          <Link
            href="/"
            className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Home
          </Link>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            If you believe you should have access to this resource, please
            contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
