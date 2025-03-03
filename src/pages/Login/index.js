import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './login.css';

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [securityKey, setSecurityKey] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ===== ADMIN AUTHENTICATION STATE =====
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminAccessText, setAdminAccessText] = useState('');
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [generatedAdminCode, setGeneratedAdminCode] = useState('');
  const [adminVerified, setAdminVerified] = useState(false);

  // Check for stored admin verification
  useEffect(() => {
    const storedAdminVerified = localStorage.getItem('adminVerified');
    if (storedAdminVerified === 'true') {
      setAdminVerified(true);
    }
  }, []);

  // If a security key is already set, redirect to the main page.
  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem('isLoggedIn');
    const storedSecurityKey = localStorage.getItem('securityKey');
    if (storedIsLoggedIn === 'true' && storedSecurityKey) {
      navigate('/');
    }
  }, [navigate]);

  // Set initial states using localStorage values on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('email');
    if (storedEmail) {
      setEmail(storedEmail);
    }
    
    if (localStorage.getItem('isLoggedIn') === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleEmailChange = (e) => setEmail(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);
  const handleSecurityKeyChange = (e) => setSecurityKey(e.target.value);

  const closeLogin = () => {
    navigate('/');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        // Mark the user as logged in and store their email, user id and user data.
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('email', email);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Store the expected encrypted security key from the server response
        localStorage.setItem('expectedSecurityKey', data.encryptedKey);
        setIsLoggedIn(true);
      }
    } catch (error) {
      setError('Login failed. Please try again later.');
      console.error('Login error:', error);
    }
  };

  const handleSecuritySubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!securityKey.trim()) {
      setError('Security Key cannot be empty.');
      return;
    }

    // Retrieve the expected security key from localStorage
    const expectedSecurityKey = localStorage.getItem('expectedSecurityKey');

    // Compare the user input with the expected encrypted key
    if (securityKey !== expectedSecurityKey) {
      setError('Invalid Security Key.');
      return;
    }

    // If the key is valid, store it (if needed) and proceed
    localStorage.setItem('securityKey', securityKey);
    window.location.reload();
  };

  // ===== ADMIN ACCESS FUNCTIONS =====

  // Helper function to get the current date string in Romania time
  const getRomaniaDateString = () => {
    return new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Bucharest' });
  };

  // Generate a random admin code with today's Romania date
  const generateAdminCode = () => {
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    const today = getRomaniaDateString();
    return `${today}-${randomString}`;
  };

  // Expected access text for admin
  const expectedAccessText = "try123";

  const handleSendAdminCode = async () => {
    if (!adminEmail) {
      setError('Please enter a valid email address for admin access.');
      return;
    }
    if (adminAccessText !== expectedAccessText) {
      setError('Access text is incorrect.');
      return;
    }
    const code = generateAdminCode();
    setGeneratedAdminCode(code);
    try {
      const response = await fetch('http://localhost:5000/api/send-admin-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, code: code }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send admin code.');
      }
      setError('Admin code sent to your email.');
    } catch (error) {
      setError('Error sending admin code: ' + error.message);
    }
  };

  const handleVerifyAdminCode = () => {
    if (adminCodeInput === generatedAdminCode) {
      setAdminVerified(true);
      localStorage.setItem('adminVerified', 'true');
      setError(
        <>
          Admin verified! Access granted.
          <br />
          Please login your account now with Admin Access.
        </>
      );      
      setShowAdminInput(false);
    } else {
      setError('Incorrect admin code. Please try again.');
    }
  };

  const handleAdminLogout = () => {
    setAdminVerified(false);
    localStorage.removeItem('adminVerified');
    setGeneratedAdminCode('');
    setAdminCodeInput('');
    setAdminEmail('');
    setAdminAccessText('');
    setError('Admin logged out.');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-box">
          <span className="close-btn" onClick={closeLogin}>
            <span role="img" aria-label="Close">❌</span>
          </span>

          <h1>Login</h1>
          <p className="quote">"In a world full of distractions, choose virtue over vice."</p>

          {!isLoggedIn ? (
            <form onSubmit={handleLoginSubmit}>
              <div className="control block-cube">
                <div className="block-cube-hover">
                  <div className="block-input">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={handleEmailChange}
                      required
                    />
                  </div>
                  <div className="block-input">
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="remember"
                  defaultChecked={email !== ''}
                />
                <label htmlFor="remember" className="label">Remember me!</label>
              </div>
              <button className="btn block-cube-hover" type="submit">Log In</button>
            </form>
          ) : (
            <div className="security-key-form">
              <h2>Enter Security Key</h2>
              <form onSubmit={handleSecuritySubmit}>
                <input
                  type="text"
                  placeholder="Security Key"
                  value={securityKey}
                  onChange={handleSecurityKeyChange}
                  required
                />
                <button type="submit" className='btn btn-cube-hover'>Submit</button>
              </form>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="social-login">
            <button className="btn social-btn block-cube-hover">
              <span role="img" aria-label="Lock">🔒</span> Log In
            </button>
            <button className="btn social-btn block-cube-hover">
              <span role="img" aria-label="Cross">❌</span> Log In
            </button>
            <button className="btn social-btn block-cube-hover">
              <span role="img" aria-label="Search">🔍</span> Log In
            </button>
          </div>

          <p className="sign-up">Repent some Sins? <Link to="/signup">Sign up!</Link></p>

          {/* ===== ADMIN ACCESS BUTTON & PANEL AT BOTTOM ===== */}
          <div className="admin-login-section">
            {adminVerified ? (
              <button onClick={handleAdminLogout} className="btn">Logout Admin</button>
            ) : (
              <button onClick={() => setShowAdminInput(true)} className="btn">Admin</button>
            )}
          </div>
          {showAdminInput && !adminVerified && (
            <div className="admin-auth">
              <h3 style={{color: '#ffeb3b'}}>Admin Login</h3>
              <input
                type="email"
                placeholder="Enter admin email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
              <input
                type="text"
                placeholder="Enter access text"
                value={adminAccessText}
                onChange={(e) => setAdminAccessText(e.target.value)}
              />
              <button onClick={handleSendAdminCode} className='btn'>Send Code</button>
              {generatedAdminCode && (
                <>
                  <input
                    type="text"
                    placeholder="Enter the code you received"
                    value={adminCodeInput}
                    onChange={(e) => setAdminCodeInput(e.target.value)}
                  />
                  <button onClick={handleVerifyAdminCode} className='btn'>Verify Code</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
