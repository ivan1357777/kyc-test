import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import './login.css';

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [securityKey, setSecurityKey] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Set initial states using localStorage values on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('email');
    const storedIsLoggedIn = localStorage.getItem('isLoggedIn');
    
    if (storedEmail) {
      setEmail(storedEmail);
    }
    
    if (storedIsLoggedIn === 'true') {
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
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('email', email);
        setIsLoggedIn(true);
      }
    } catch (error) {
      setError('Login failed. Please try again later.');
      console.error('Login error:', error);
    }
  };

  const handleSecuritySubmit = (e) => {
    e.preventDefault();

    if (!securityKey.trim()) {
      setError('Security Key cannot be empty.');
      return;
    }

    try {
      const encryptedKey = CryptoJS.AES.encrypt(securityKey, 'your-secret-key').toString();
      console.log('Encrypted Security Key:', encryptedKey);
      localStorage.setItem('securityKey', encryptedKey);
      navigate('/');
    } catch (error) {
      setError('Invalid Security Key.');
      console.error('Encryption error:', error);
    }
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
        </div>
      </div>
    </div>
  );
};

export default Login;
