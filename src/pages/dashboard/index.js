import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './dashboard.css';
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

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="App">
      <div className="circle-buttons-container">
        <button className="circle-button-home" onClick={() => navigate('/home')}>
          <img src="/home1.png" alt="Home" className="circle-icon" />
        </button>
        <button className="circle-button-lock" onClick={() => navigate('/lock')}>
          <img src={`${process.env.PUBLIC_URL}/sign-in.png`} alt="Lock" className="circle-icon" />
        </button>
        <button className="circle-button-shopping-cart" onClick={() => navigate('/presale')}>
          <img src={`${process.env.PUBLIC_URL}/presale.png`} alt="Presale" className="circle-icon" />
        </button>
        <button className="circle-button-game" onClick={() => navigate('/game')}>
          <img src={`${process.env.PUBLIC_URL}/game.png`} alt="Game" className="circle-icon" />
        </button>
        <button className="circle-button-head" onClick={() => navigate('/profile')}>
          <img src={`${process.env.PUBLIC_URL}/profile.png`} alt="Profile" className="circle-icon" />
        </button>
        <button className="circle-button-dollar" onClick={() => navigate('/about-us')}>
          <img src={`${process.env.PUBLIC_URL}/about-us.png`} alt="About Us" className="circle-icon" />
        </button>
        <button className="circle-button-check" onClick={() => navigate('/stats')}>
          <img src={`${process.env.PUBLIC_URL}/stats.png`} alt="Stats" className="circle-icon" />
        </button>
        <button className="circle-button-help" onClick={() => navigate('/help')}>
          <img src={`${process.env.PUBLIC_URL}/help.png`} alt="Help" className="circle-icon" />
        </button>
        <button className="circle-button-file" onClick={() => navigate('/whitepaper')}>
          <img src={`${process.env.PUBLIC_URL}/whitepaper.png`} alt="Whitepaper" className="circle-icon" />
        </button>
        <button className="circle-button-map" onClick={() => navigate('/roadmap')}>
          <img src={`${process.env.PUBLIC_URL}/roadmap.png`} alt="Roadmap" className="circle-icon" />
        </button>
        <button className="circle-button-rewards" onClick={() => navigate('/confess-and-earn')}>
          <img src={`${process.env.PUBLIC_URL}/confese-and-earn.png`} alt="Rewards" className="circle-icon" />
        </button>
        <button className="circle-button-learn" onClick={() => navigate('/good')}>
          <img src={`${process.env.PUBLIC_URL}/home2.png`} alt="good" className="circle-icon" />
        </button>
        <button className="circle-button-login" onClick={() => navigate('/login')}>
          <img src={`${process.env.PUBLIC_URL}/login.png`} alt="Login" className="circle-icon" />
        </button>
      </div>

      <Routes>

        {/*<Route path="/" element={<Home />} />*/}

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

        {/*<Route path="*" element={<div>404 - Page Not Found</div>} />*/}
      </Routes>
    </div>
  );
}

export default Dashboard;
