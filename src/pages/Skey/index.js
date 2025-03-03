import React, { useState } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import './skey.css';

const Skey = ({ onSuccess }) => {
  const [key, setKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // AES-256-CBC encryption function
  const encryptKey = (key) => {
    const secretKey = CryptoJS.enc.Utf8.parse('your-secret-key-32bytes-long!'); // 32 bytes
    const iv = CryptoJS.enc.Utf8.parse('your-16-byte-iv!'); // 16 bytes

    const encrypted = CryptoJS.AES.encrypt(key, secretKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return encrypted.toString(); // Base64 output
  };

  const handleKeySubmit = async (e) => {
    e.preventDefault();

    const encryptedKey = encryptKey(key);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/validate-key',
        { key: encryptedKey },
        { headers: { 'Content-Type': 'application/json' } }
      );

      setMessage(response.data.message);
      setError('');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred.');
      setMessage('');
    }
  };

  return (
    <div className="skey-page">
      <div className="skep-container">
        <h1>Security Key</h1>
        <form onSubmit={handleKeySubmit}>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter Security Key"
            required
          />
          <button type="submit">Submit</button>
        </form>
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};

export default Skey;
