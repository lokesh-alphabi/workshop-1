import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Authentication Error | Project Management Tool",
  description: "An error occurred during authentication",
};

interface AuthErrorPageProps {
  searchParams: {
    error?: string;
  };
}

/**
 * Authentication Error Page
 * Displays user-friendly error messages for authentication failures
 */
export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { error } = searchParams;

  const getErrorMessage = (errorType?: string): string => {
    switch (errorType) {
      case "CredentialsSignin":
        return "Invalid email or password. Please check your credentials and try again.";
      case "EmailSignin":
        return "Unable to send email. Please try again later.";
      case "OAuthSignin":
        return "Error occurred with the authentication provider. Please try again.";
      case "OAuthCallback":
        return "Error occurred during authentication callback. Please try again.";
      case "OAuthCreateAccount":
        return "Could not create account with the authentication provider.";
      case "EmailCreateAccount":
        return "Could not create account with the provided email.";
      case "Callback":
        return "Error occurred during authentication callback.";
      case "OAuthAccountNotLinked":
        return "This account is linked to a different authentication method.";
      case "SessionRequired":
        return "You must be signed in to access this page.";
      case "AccessDenied":
        return "Access denied. You do not have permission to access this resource.";
      default:
        return "An unexpected error occurred during authentication. Please try again.";
    }
  };

  const getErrorTitle = (errorType?: string): string => {
    switch (errorType) {
      case "AccessDenied":
        return "Access Denied";
      case "SessionRequired":
        return "Authentication Required";
      default:
        return "Authentication Error";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
            {getErrorTitle(error)}
          </h1>

          <p className="mt-4 text-lg text-gray-600">{getErrorMessage(error)}</p>
        </div>

        <div className="space-y-4">
          <Link
            href="/auth/signin"
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </Link>

          <Link
            href="/"
            className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Home
          </Link>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            If the problem persists, please contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
