import React from 'react';
import { useNavigate } from 'react-router-dom';
import './lock.css';

const Lock = () => {
  const navigate = useNavigate();

  const handleLockUnlock = () => {
    const isLocked = localStorage.getItem('isLocked') === 'true';

    if (isLocked) {
      localStorage.setItem('isLocked', 'false');
    } else {
      localStorage.setItem('isLocked', 'true');
    }

    navigate('/');
  };

  return (
    <div className="lock-page">
      <div className="lock-container">
        <h1>{localStorage.getItem('isLocked') === 'true' ? 'Unlock' : 'Lock'}</h1>
        <p>
          {localStorage.getItem('isLocked') === 'true'
            ? 'Your account is currently locked. Click below to unlock it.'
            : 'Click below to lock your account.'}
        </p>

        {/* Lock/Unlock button */}
        <button className="btn btn-cube-hover" onClick={handleLockUnlock}>
          {localStorage.getItem('isLocked') === 'true' ? 'Unlock Account' : 'Lock Account'}
        </button>
      </div>
    </div>
  );
};

export default Lock;
