// src/pages/SignUp/index.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./SignUp.css";

const Signup = () => {
  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [walletPhantom, setWalletPhantom] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Other States
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  // New state to hold the generated code from the email
  const [generatedCode, setGeneratedCode] = useState("");

  // New states for email verification messages
  const [emailVerificationError, setEmailVerificationError] = useState("");
  const [emailVerificationSuccess, setEmailVerificationSuccess] = useState("");

  // Honeypot field (should remain empty for real users)
  const [hiddenField, setHiddenField] = useState("");

  // Password criteria checks
  const isLongEnough = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  // Compute password strength based on criteria met
  const getPasswordStrength = () => {
    if (!password) return "";
    const count = [isLongEnough, hasUppercase, hasSpecialChar, hasNumber].filter(Boolean).length;
    if (count <= 2) return "Weak";
    else if (count === 3) return "Medium";
    else if (count === 4) return "Strong";
  };

  const navigate = useNavigate();

  // Function to send the email verification code
  const sendVerificationCode = async () => {
    // Clear previous email verification messages
    setEmailVerificationError("");
    setEmailVerificationSuccess("");
    if (!email) {
      setEmailVerificationError("Please enter your email first.");
      return;
    }
    setIsSendingCode(true);
    try {
      const response = await axios.post("http://localhost:5000/api/send-email-code", { email });
      setEmailVerificationSuccess(response.data.message);
      setCodeSent(true); // Mark that the code has been sent

      // Store the generated code from the server response
      if (response.data.code) {
        setGeneratedCode(response.data.code);
      }
    } catch (err) {
      const detailedError =
        err.response && err.response.data && err.response.data.error
          ? err.response.data.error
          : "Failed to send verification code. Please try again later.";
      setEmailVerificationError(detailedError);
    } finally {
      setIsSendingCode(false);
    }
  };

  // NEW: States and functions for Account Verification (separate from email verification)
  const [accountCreated, setAccountCreated] = useState(false);
  const [accountVerified, setAccountVerified] = useState(false);
  const [accountCode, setAccountCode] = useState("");
  const [accountVerificationError, setAccountVerificationError] = useState("");
  const [accountVerificationSuccess, setAccountVerificationSuccess] = useState("");

  // Modified function to handle form submission for signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // Validate Username length
    if (username.length < 5 || username.length > 20) {
      setError("Username must be between 5 and 20 characters.");
      return;
    }

    // Validate Email Verification Code
    if (!emailCode) {
      setError("Please enter the email verification code sent to your email.");
      return;
    }
    // Check if the entered code matches the generated code
    if (emailCode !== generatedCode) {
      setError("Invalid email verification code.");
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Validate password meets all criteria
    if (!isLongEnough || !hasUppercase || !hasSpecialChar || !hasNumber) {
      setError("Password does not meet the required criteria.");
      return;
    }

    // Ensure Terms & Conditions are accepted
    if (!termsAccepted) {
      setError("You must agree to the Terms & Conditions.");
      return;
    }

    const formData = {
      firstName,
      lastName,
      username,
      email,
      emailCode,
      password,
      confirmPassword,
      walletPhantom,
      hiddenField,
      termsAccepted,
    };

    try {
      // eslint-disable-next-line no-unused-vars
      const response = await axios.post("http://localhost:5000/api/signup", formData);
      // Instead of immediately verifying the account, mark the account as created
      setSuccessMessage("Account created successfully! Please verify your account.");
      setAccountCreated(true);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("An error occurred. Please try again later.");
      }
    }
  };

  // NEW: Function to send account verification code (calls new server endpoint)
  const sendAccountVerificationCode = async () => {
    setAccountVerificationError("");
    setAccountVerificationSuccess("");
    try {
      const response = await axios.post("http://localhost:5000/api/send-account-code", { email });
      setAccountVerificationSuccess(response.data.message);
    } catch (err) {
      const errorMsg =
        err.response && err.response.data && err.response.data.error
          ? err.response.data.error
          : "Failed to send account verification code.";
      setAccountVerificationError(errorMsg);
    }
  };

  // NEW: Function to handle account verification submission
  const handleAccountVerification = async (e) => {
    e.preventDefault();
    setAccountVerificationError("");
    setAccountVerificationSuccess("");
    if (!accountCode) {
      setAccountVerificationError("Please enter the account verification code.");
      return;
    }
    try {
      const response = await axios.post("http://localhost:5000/api/verify-account", { email, accountCode });
      setAccountVerificationSuccess(response.data.message);
      setAccountVerified(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      const errorMsg =
        err.response && err.response.data && err.response.data.error
          ? err.response.data.error
          : "Failed to verify account.";
      setAccountVerificationError(errorMsg);
    }
  };

  const close = () => navigate("/");

  // Conditional Rendering for Account Verification Phase
  if (accountCreated && !accountVerified) {
    return (
      <div className="signup-page">
        <div className="signup-container">
          <span className="close-btn" onClick={close}>
            <span role="img" aria-label="close">❌</span>
          </span>
          <h1>Account Verification</h1>
          <p>{successMessage}</p>
          <button className="btn" onClick={sendAccountVerificationCode}>
            Send Account Verification Code
          </button>
          {accountVerificationError && (
            <p className="error-message" style={{ color: "red" }}>
              {accountVerificationError}
            </p>
          )}
          {accountVerificationSuccess && (
            <p className="success-message" style={{ color: "green" }}>
              {accountVerificationSuccess}
            </p>
          )}
          <form onSubmit={handleAccountVerification}>
            <div>
              <label>Account Verification Code</label>
              <input
                type="text"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                required
                placeholder="Enter Account Verification Code"
              />
            </div>
            <button type="submit" className="btn">
              Verify Account
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (accountVerified) {
    return (
      <div className="signup-page">
        <div className="signup-container">
          <h1>Account verified.</h1>
          <p>Your account has been verified. You can now log in.</p>
          <button className="btn" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      </div>
    );
  }

  // Default: Render Signup Form (includes email verification process)
  return (
    <div className="signup-page">
      <div className="signup-container">
        <span className="close-btn" onClick={close}>
          <span role="img" aria-label="close">❌</span>
        </span>

        <h1>Repent some sins, join the movement!</h1>
        <h2>Sign Up</h2>

        <form onSubmit={handleSubmit}>
          <div>
            <label>First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              placeholder="Enter First Name"
            />
          </div>
          <div>
            <label>Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              placeholder="Enter Last Name"
            />
          </div>
          <div>
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter Username (5-20 characters)"
            />
          </div>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter Email Address"
            />
            <button
              type="button"
              onClick={sendVerificationCode}
              disabled={isSendingCode}
              className="btn"
            >
              {isSendingCode ? "Sending..." : (codeSent ? "Resend Code" : "Send Verification Code")}
            </button>
            {/* Display email verification messages immediately below the button */}
            {emailVerificationError && <p className="error-message" style={{ color: "red" }}>{emailVerificationError}</p>}
            {emailVerificationSuccess && <p className="success-message" style={{ color: "green" }}>{emailVerificationSuccess}</p>}
          </div>
          {codeSent && (
            <div>
              <label>Email Verification Code</label>
              <input
                type="text"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                required
                placeholder="Enter Code here"
              />
            </div>
          )}

          {/* Email Confirmation Process Information */}
          <div>
            <h4 style={{color: '#ffeb3b'}}>Email Confirmation Process</h4>
            <ul style={{ listStyleType: "disc", paddingLeft: "1.5rem" }}>
              <li>After registering, you'll receive an email with an activation code.</li>
              <li>Enter the code to activate your account.</li>
              <li>If email verification is not completed, the account remains inactive.</li>
              <li>If not confirmed within 24 hours, your account will be automatically deleted.</li>
            </ul>
          </div>

          <div>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter Password (8-20 characters)"
            />
            {/* Display Password Criteria */}
            <ul className="password-criteria" style={{ listStyleType: "none", padding: 0 }}>
              <li style={{ color: isLongEnough ? "green" : "red", fontSize: "0.8rem" }}>
                {isLongEnough ? "✓" : "✗"} At least 8 characters long
              </li>
              <li style={{ color: hasUppercase ? "green" : "red", fontSize: "0.8rem" }}>
                {hasUppercase ? "✓" : "✗"} Contains an uppercase letter
              </li>
              <li style={{ color: hasNumber ? "green" : "red", fontSize: "0.8rem" }}>
                {hasNumber ? "✓" : "✗"} Contains a number
              </li>
              <li style={{ color: hasSpecialChar ? "green" : "red", fontSize: "0.8rem" }}>
                {hasSpecialChar ? "✓" : "✗"} Contains a special character (!@#$%^&*)
              </li>
            </ul>
            {password && (
              <p className={`password-strength ${getPasswordStrength().toLowerCase()}`}>
                Password Strength: {getPasswordStrength()}
              </p>
            )}
          </div>
          <div>
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Re-enter Password"
            />
          </div>
          <div>
            <label>Wallet Phantom (optional)</label>
            <input
              type="text"
              value={walletPhantom}
              onChange={(e) => setWalletPhantom(e.target.value)}
              placeholder="Your Wallet Phantom address"
            />
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
              />
              I agree to Terms &amp; Conditions.
            </label>
          </div>

          {/* Honeypot Field (Invisible to Users) */}
          <div style={{ display: "none" }}>
            <label>Do Not Fill This Field</label>
            <input
              type="text"
              value={hiddenField}
              onChange={(e) => setHiddenField(e.target.value)}
            />
          </div>

          <button type="submit" className="btn">Sign Up Now</button>
        </form>

        {/* Global messages for signup form submission */}
        {error && <p className="error-message" style={{ color: "red" }}>{error}</p>}
        
        {/* Link for existing users */}
        <p style={{ marginTop: "1rem" }}>
          Already have an account?{" "}
          <a
            style={{ color: "#ffeb3b" }}
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              navigate("/login");
            }}
          >
            Log in here.
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
