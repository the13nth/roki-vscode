'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { generateVSCodeToken } from './actions';
import Link from 'next/link';

export default function VSCodeLoginPage() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [token, setToken] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('useEffect triggered:', { isSignedIn, userId, user });
    if (isSignedIn && userId && user) {
      console.log('Calling generateToken...');
      generateToken();
    }
  }, [isSignedIn, userId, user]);

  const generateToken = async () => {
    if (!user) {
      console.error('No user data available');
      return;
    }

    setLoading(true);
    try {
      console.log('Generating VSCode token...');
      
      const userEmail = user.emailAddresses[0]?.emailAddress || '';
      const userName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.username || 'User';
      
      const result = await generateVSCodeToken(user.id || '', userEmail, userName);
      
      console.log('Token generation result:', result);
      
      if (result.success && result.token) {
        console.log('Token generated successfully:', result);
        setToken(result.token);
      } else {
        console.error('Failed to generate token:', result.error);
      }
    } catch (error) {
      console.error('Error generating token:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              VSCode Extension Login
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please sign in to get your authentication token
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                You need to be signed in to use the VSCode extension.
              </p>
              <Link
                href="/sign-in?redirect_url=/auth/vscode-login"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            VSCode Extension Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Copy this token to authenticate your VSCode extension
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                Authentication Token
              </label>
              <div className="mt-1 relative">
                <textarea
                  id="token"
                  rows={4}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md font-mono text-xs"
                  value={token}
                  readOnly
                  placeholder={loading ? "Generating token..." : "Loading token..."}
                />
                {!token && !loading && (
                  <p className="mt-1 text-sm text-red-600">
                    Token not generated. Click "Regenerate Token" to try again.
                  </p>
                )}
                {loading && (
                  <p className="mt-1 text-sm text-blue-600">
                    Generating your VSCode authentication token...
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={copyToken}
                disabled={!token}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  copied
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {copied ? '✅ Copied!' : '📋 Copy Token'}
              </button>
              
              <button
                onClick={generateToken}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {loading ? '🔄 Generating...' : '🔄 Regenerate Token'}
              </button>
            </div>

            <div className="text-sm text-gray-500">
              <h3 className="font-medium text-gray-700 mb-2">Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Copy the token above</li>
                <li>Go back to VSCode</li>
                <li>Paste the token when prompted</li>
                <li>You'll be logged in and can access your projects</li>
              </ol>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-400 text-center">
                This token allows the VSCode extension to access your projects securely.
                Keep it private and don't share it with others.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}