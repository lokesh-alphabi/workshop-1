import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth-utils";
import Link from "next/link";

export default async function Home() {
  // Check if user is already authenticated
  const session = await getCurrentSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Project Manager
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Keyboard-centric project management tool for team collaboration
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/auth/signin"
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign In
          </Link>

          <div className="text-sm text-gray-500">
            <p>Need access? Contact your system administrator.</p>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Features</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>✓ Project and task management</p>
            <p>✓ Sprint planning and tracking</p>
            <p>✓ Role-based access control</p>
            <p>✓ Keyboard shortcuts for productivity</p>
          </div>
        </div>
      </div>
    </div>
  );
}
