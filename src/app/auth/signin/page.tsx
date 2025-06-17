import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign In | Project Management Tool",
  description: "Sign in to access your projects and tasks",
};

/**
 * Sign In Page
 * Redirects authenticated users to dashboard
 */
export default async function SignInPage() {
  // Redirect if already authenticated
  const session = await getCurrentSession();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Project Management Tool
          </h1>
          <h2 className="mt-2 text-center text-xl text-gray-600">
            Sign in to your account
          </h2>
          <p className="mt-4 text-center text-sm text-gray-500">
            Use your email and password to access the system
          </p>
        </div>

        <LoginForm />

        <div className="text-center">
          <p className="text-xs text-gray-500">
            For system setup, contact your administrator
          </p>
        </div>
      </div>
    </div>
  );
}
