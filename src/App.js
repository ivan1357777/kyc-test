import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import Lock from './pages/Lock';
import Presale from './pages/Presale';
import Game from './pages/Game';
import Profile from './pages/Profile';
import AboutUs from './pages/AboutUs';
import Stats from './pages/Stats';
import Help from './pages/Help';
import Whitepaper from './pages/Whitepaper';
import RoadMap from './pages/RoadMap';
import ConfessAndEarn from './pages/ConfessAndEarn';
import Good from './pages/Good';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Skey from './pages/Skey';

function App() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  // Detect login status and screen orientation
  useEffect(() => {
    // Check if the user is logged in
    const userStatus = localStorage.getItem('isLoggedIn');
    setIsLoggedIn(userStatus === 'true');

    // Orientation change listener
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigation = (path) => {
    if (!isLoggedIn && path !== '/login' && path !== '/signup') {
      navigate('/login');
    } else {
      navigate(path);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    navigate('/login');
  };

  const handleLockToggle = () => {
    setIsLocked((prevState) => !prevState);
  };

  return (
    <div className="App">
      <div className="circle-buttons-container">
        {/* Navigation Buttons */}
        <button className="circle-button-home" onClick={() => handleNavigation('/home')} disabled={isLocked}>
          <img src={isPortrait ? "/home1-portrait.png" : "/home1.png"} alt="Home" className="circle-icon" />
        </button>
        <button className="circle-button-lock" onClick={handleLockToggle}>
          <img 
            src={isPortrait ? "/sign-in-portrait.png" : (isLocked ? "/sign-in.png" : "/sign-in.png")} 
            alt={isLocked ? "Unlock" : "Lock"} 
            className="circle-icon" 
          />
        </button>
        <button className="circle-button-shopping-cart" onClick={() => handleNavigation('/presale')} disabled={isLocked}>
          <img src={isPortrait ? "/presale-portrait.png" : "/presale.png"} alt="Presale" className="circle-icon" />
        </button>
        <button className="circle-button-game" onClick={() => handleNavigation('/game')} disabled={isLocked}>
          <img src={isPortrait ? "/game-portrait.png" : "/game.png"} alt="Game" className="circle-icon" />
        </button>
        <button className="circle-button-head" onClick={() => handleNavigation('/profile')} disabled={isLocked}>
          <img src={isPortrait ? "/profile-portrait.png" : "/profile.png"} alt="Profile" className="circle-icon" />
        </button>
        <button className="circle-button-dollar" onClick={() => handleNavigation('/about-us')} disabled={isLocked}>
          <img src={isPortrait ? "/about-us-portrait.png" : "/about-us.png"} alt="About Us" className="circle-icon" />
        </button>
        <button className="circle-button-check" onClick={() => handleNavigation('/stats')} disabled={isLocked}>
          <img src={isPortrait ? "/stats-portrait.png" : "/stats.png"} alt="Stats" className="circle-icon" />
        </button>
        <button className="circle-button-help" onClick={() => handleNavigation('/help')} disabled={isLocked}>
          <img src={isPortrait ? "/help-portrait.png" : "/help.png"} alt="Help" className="circle-icon" />
        </button>
        <button className="circle-button-file" onClick={() => handleNavigation('/whitepaper')} disabled={isLocked}>
          <img src={isPortrait ? "/whitepaper-portrait.png" : "/whitepaper.png"} alt="Whitepaper" className="circle-icon" />
        </button>
        <button className="circle-button-map" onClick={() => handleNavigation('/roadmap')} disabled={isLocked}>
          <img src={isPortrait ? "/roadmap-portrait.png" : "/roadmap.png"} alt="Roadmap" className="circle-icon" />
        </button>
        <button className="circle-button-rewards" onClick={() => handleNavigation('/confess-and-earn')} disabled={isLocked}>
          <img src={isPortrait ? "/confese-and-earn-portrait.png" : "/confese-and-earn.png"} alt="Rewards" className="circle-icon" />
        </button>
        <button className="circle-button-learn" onClick={() => handleNavigation('/good')} disabled={isLocked}>
          <img src={isPortrait ? "/home2-portrait.png" : "/home2.png"} alt="Good" className="circle-icon" />
        </button>

        {/* Login/Logout Button */}
        {!isLoggedIn ? (
          <button className="circle-button-login" onClick={() => navigate('/login')}>
            <img src={isPortrait ? "/login-portrait.png" : "/login.png"} alt="Login" className="circle-icon" />
          </button>
        ) : (
          <button className="circle-button-logout" onClick={handleLogout}>
            <img src={isPortrait ? "/login-portrait.png" : "/login.png"} alt="Logout" className="circle-icon" />
          </button>
        )}
      </div>

      {/* Page Routes */}
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/lock" element={<Lock />} />
        <Route path="/presale" element={<Presale />} />
        <Route path="/game" element={<Game />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/help" element={<Help />} />
        <Route path="/whitepaper" element={<Whitepaper />} />
        <Route path="/roadmap" element={<RoadMap />} />
        <Route path="/confess-and-earn" element={<ConfessAndEarn />} />
        <Route path="/good" element={<Good />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/skey" element={<Skey />} />
      </Routes>
    </div>
  );
}

export default App;
