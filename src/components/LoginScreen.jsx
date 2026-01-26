import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';

export default function LoginScreen({ onLogin, onRegister }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasLowercase: false,
    hasUppercase: false,
    hasNumber: false,
    hasSymbol: false
  });

  useEffect(() => {
    if (isRegistering) {
      setPasswordRequirements({
        minLength: password.length >= 8,
        hasLowercase: /[a-z]/.test(password),
        hasUppercase: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
      });
    }
  }, [password, isRegistering]);

  // Clear error when switching modes
  useEffect(() => {
    setError('');
    setSuccessMessage('');
  }, [isRegistering]);

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (isRegistering && (!firstName || !lastName)) {
      setError('Please enter your first and last name');
      return;
    }

    if (isRegistering) {
      const passwordErrors = [];
      if (password.length < 8) passwordErrors.push('at least 8 characters');
      if (!/[a-z]/.test(password)) passwordErrors.push('a lowercase letter');
      if (!/[A-Z]/.test(password)) passwordErrors.push('an uppercase letter');
      if (!/[0-9]/.test(password)) passwordErrors.push('a number');
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) passwordErrors.push('a symbol');

      if (passwordErrors.length > 0) {
        setError(`Password must contain: ${passwordErrors.join(', ')}`);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        const result = await onRegister(email, password, { firstName, lastName });
        if (result.needsEmailConfirmation) {
          setSuccessMessage('Account created! Please check your email and click the confirmation link, then log in.');
          setIsRegistering(false);
          // Clear password fields but keep email for convenience
          setPassword('');
          setConfirmPassword('');
        }
        // If no email confirmation needed, onAuthStateChange will auto-login
      } else {
        await onLogin(email, password);
        // Auth state will update automatically via Supabase listener
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRegisterDisabled = isRegistering && (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !confirmPassword ||
    password !== confirmPassword ||
    !passwordRequirements.minLength ||
    !passwordRequirements.hasLowercase ||
    !passwordRequirements.hasUppercase ||
    !passwordRequirements.hasNumber ||
    !passwordRequirements.hasSymbol
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2 text-center">PoseVault</h1>
        <p className="text-gray-400 text-center mb-6">
          {isRegistering ? 'Create your account' : 'Sign in to continue'}
        </p>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-500/20 border border-green-500 text-green-300 px-4 py-3 rounded-lg mb-4">
            {successMessage}
          </div>
        )}

        <div className="space-y-4">
          {isRegistering && (
            <>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                disabled={isSubmitting}
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                disabled={isSubmitting}
              />
            </>
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            disabled={isSubmitting}
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isRegistering && !isSubmitting && handleAuth()}
              placeholder="Password"
              className="w-full bg-gray-700 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
              disabled={isSubmitting}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {isRegistering && (
            <>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isSubmitting && handleAuth()}
                  placeholder="Confirm Password"
                  className="w-full bg-gray-700 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {confirmPassword && (
                <div className={`text-xs flex items-center gap-2 -mt-2 ${
                  password === confirmPassword ? 'text-green-400' : 'text-red-400'
                }`}>
                  <span className="w-4">{password === confirmPassword ? '✓' : '✗'}</span>
                  <span>{password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
                </div>
              )}

              {password && (
                <div className="space-y-2 -mt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={password.length >= 8 ? 'text-green-400' : 'text-gray-400'}>
                        Character Count
                      </span>
                      <span className={password.length >= 8 ? 'text-green-400' : 'text-gray-400'}>
                        {password.length}/8
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          password.length >= 8 ? 'bg-green-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${Math.min((password.length / 8) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className={`flex items-center gap-2 ${passwordRequirements.hasLowercase ? 'text-green-400' : 'text-gray-400'}`}>
                      <span className="w-4">{passwordRequirements.hasLowercase ? '✓' : '○'}</span>
                      <span>Lowercase letter (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordRequirements.hasUppercase ? 'text-green-400' : 'text-gray-400'}`}>
                      <span className="w-4">{passwordRequirements.hasUppercase ? '✓' : '○'}</span>
                      <span>Uppercase letter (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordRequirements.hasNumber ? 'text-green-400' : 'text-gray-400'}`}>
                      <span className="w-4">{passwordRequirements.hasNumber ? '✓' : '○'}</span>
                      <span>Number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordRequirements.hasSymbol ? 'text-green-400' : 'text-gray-400'}`}>
                      <span className="w-4">{passwordRequirements.hasSymbol ? '✓' : '○'}</span>
                      <span>Symbol (!@#$%...)</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <button
            onClick={handleAuth}
            disabled={isRegisterDisabled || isSubmitting}
            className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors ${
              isRegisterDisabled || isSubmitting
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                {isRegistering ? 'Creating Account...' : 'Signing In...'}
              </span>
            ) : (
              isRegistering ? 'Register' : 'Login'
            )}
          </button>

          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full text-gray-400 hover:text-white transition-colors text-sm cursor-pointer"
            disabled={isSubmitting}
          >
            {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Powered by{' '}
            <a
              href="http://www.dockercapphotography.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors underline"
            >
              Docker Cap Photography
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
