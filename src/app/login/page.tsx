'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp, confirmSignUp } from '@/lib/auth';
import { userAPI } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'mentor'>('student');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (needsConfirmation) {
        console.log('Step 1: Confirming email...');
        await confirmSignUp(email, confirmationCode);
        console.log('Step 2: Email confirmed, now signing in...');
        
        const result: any = await signIn(email, password);
        console.log('Step 3: Sign in successful, result:', result);
        
        const userId = result.idToken.split('.')[1];
        const payload = JSON.parse(atob(userId));
        const cognitoUserId = payload.sub;
        console.log('Step 4: Got user ID:', cognitoUserId);
        
        console.log('Step 5: Setting role to:', role);
        const roleResult = await userAPI.setRole(cognitoUserId, email, role);
        console.log('Step 6: Role set result:', roleResult);
        
        setSuccess('Account setup complete! Redirecting...');
        
        setTimeout(() => {
          console.log('Step 7: Redirecting to dashboard...');
          if (role === 'student') {
            router.push('/student/dashboard');
          } else {
            router.push('/mentor/dashboard');
          }
        }, 1000);
        
      } else if (isSignUp) {
        console.log('Starting sign up...');
        await signUp(email, password);
        setSuccess('Sign up successful! Please check your email for confirmation code.');
        setNeedsConfirmation(true);
      } else {
        console.log('Starting sign in...');
        const result: any = await signIn(email, password);
        
        const userId = result.idToken.split('.')[1];
        const payload = JSON.parse(atob(userId));
        const cognitoUserId = payload.sub;

        const roleResult = await userAPI.getRole(cognitoUserId);
        
        if (roleResult.success && roleResult.user) {
          if (roleResult.user.role === 'student') {
            router.push('/student/dashboard');
          } else if (roleResult.user.role === 'mentor') {
            router.push('/mentor/dashboard');
          }
        } else {
          setError('Account not properly set up. Please contact support.');
        }
      }
    } catch (err: any) {
      console.error('Error occurred:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {needsConfirmation ? 'Confirm Email' : isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-600">
            {needsConfirmation
              ? 'Enter the confirmation code sent to your email'
              : isSignUp
              ? 'Sign up to start tracking your goals'
              : 'Sign in to continue to Momentum'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {needsConfirmation ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmation Code
              </label>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter 6-digit code"
                required
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                {isSignUp && (
                  <p className="mt-2 text-xs text-gray-500">
                    Password must be at least 8 characters with uppercase, lowercase, and numbers
                  </p>
                )}
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    I am a...
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        role === 'student'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">🎓</div>
                      <div className="font-semibold text-gray-800">Student</div>
                      <div className="text-xs text-gray-600 mt-1">Track my goals</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('mentor')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        role === 'mentor'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">👨‍🏫</div>
                      <div className="font-semibold text-gray-800">Mentor</div>
                      <div className="text-xs text-gray-600 mt-1">Guide mentees</div>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? 'Please wait...'
              : needsConfirmation
              ? 'Confirm Email'
              : isSignUp
              ? 'Sign Up'
              : 'Sign In'}
          </button>
        </form>

        {!needsConfirmation && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess('');
              }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}

        {needsConfirmation && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setNeedsConfirmation(false);
                setIsSignUp(false);
                setError('');
                setSuccess('');
              }}
              className="text-gray-600 hover:text-gray-700 text-sm"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
