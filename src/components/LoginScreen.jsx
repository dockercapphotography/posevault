import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { storage } from '../utils/storage';

export default function LoginScreen({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
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

  const handleAuth = async () => {
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    if (isRegistering && (!firstName || !lastName)) {
      alert('Please enter your first and last name');
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
        alert(`Password must contain:\n• ${passwordErrors.join('\n• ')}`);
        return;
      }
    }

    const userKey = `user:${email}`;

    if (isRegistering) {
      try {
        const existingUser = await storage.get(userKey);
        if (existingUser) {
          alert('An account with this email already exists. Please login or use a different email.');
          return;
        }

        if (!passwordRequirements.minLength || !passwordRequirements.hasLowercase || 
            !passwordRequirements.hasUppercase || !passwordRequirements.hasNumber || 
            !passwordRequirements.hasSymbol) {
          alert('Please meet all password requirements before registering.');
          return;
        }

        const userData = {
          email: email,
          firstName: firstName,
          lastName: lastName,
          password: password,
          createdAt: new Date().toISOString()
        };

        await storage.set(userKey, JSON.stringify(userData));
        await onLogin(email, userData);
        
      } catch (error) {
        alert('Registration failed. Please try again.');
        console.error(error);
      }
    } else {
      try {
        const result = await storage.get(userKey);
        
        if (!result) {
          alert('User not found. Please register first.');
          return;
        }

        const userData = JSON.parse(result.value);
        
        if (userData.password !== password) {
          alert('Incorrect password');
          return;
        }

        await onLogin(email, userData);
        
      } catch (error) {
        alert('Login failed. Please try again.');
        console.error(error);
      }
    }
  };

  const skipRegistration = async () => {
    try {
      const guestEmail = 'guest@posevault.local';
      
      if (typeof localStorage === 'undefined') {
        alert('LocalStorage not available. Please enable cookies and storage in your browser settings.');
        return;
      }
      
      await onLogin(guestEmail, { firstName: 'Guest', lastName: 'User' });
      setShowGuestModal(false);
    } catch (error) {
      alert('Error logging in as guest: ' + error.message);
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
        
        <div className="space-y-4">
          {isRegistering && (
            <>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </>
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isRegistering && handleAuth()}
              placeholder="Password"
              className="w-full bg-gray-700 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
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
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  placeholder="Confirm Password"
                  className="w-full bg-gray-700 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
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
            disabled={isRegisterDisabled}
            className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors ${
              isRegisterDisabled
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {isRegistering ? 'Register' : 'Login'}
          </button>
          
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full text-gray-400 hover:text-white transition-colors text-sm"
          >
            {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>

          <button
            onClick={() => setShowGuestModal(true)}
            className="w-full bg-yellow-600 hover:bg-yellow-700 px-4 py-3 rounded-lg font-semibold transition-colors mt-2"
          >
            ⚡ Continue as Guest
          </button>

          {/* DEBUG ONLY */}
          <button
            onClick={() => onLogin('debug@posevault.local', { firstName: 'Debug', lastName: 'User' })}
            className="w-full bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg font-semibold transition-colors mt-2 text-xs"
          >
            🚀 SKIP LOGIN (DEBUG)
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

      {/* Guest Mode Warning Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-yellow-400">⚠️ Guest Mode Warning</h2>
              <button
                onClick={() => setShowGuestModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="mb-6 space-y-3 text-gray-300">
              <p>
                Without an account, your data will be saved under a <strong>shared guest account</strong>.
              </p>
              <p className="text-yellow-300">
                <strong>This means:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Anyone using guest mode on this device will see your categories and images</li>
                <li>Others can modify or delete your content</li>
                <li>Your data is not private or secure</li>
              </ul>
              <p className="pt-2 text-purple-300">
                For private storage, please create an account.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGuestModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg transition-colors font-semibold"
              >
                Go Back
              </button>
              <button
                onClick={skipRegistration}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 px-4 py-3 rounded-lg transition-colors font-semibold"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
