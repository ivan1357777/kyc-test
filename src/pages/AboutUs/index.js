import React from 'react';
import { useNavigate } from 'react-router-dom';
import './about.css';

const About = () => {
  const navigate = useNavigate();

  const close = () => {
    navigate('/');
  };

  return (
    <div className="about-page">
      <div className="about-container">
        <span className="close-btn" onClick={close}>
          <span role="img" aria-label="cross mark">❌</span>
        </span>
        <h1>About</h1>
        <h4>Discover Our Vision and Plans</h4>
        <p>
          Welcome to [Project Name], a groundbreaking initiative in the field of [industry/sector]. Our project aims to [brief description of goals and desired impact].
        </p>
        <p>
          As part of this project, we will develop [brief description of main components, such as NFTs, tokens, gaming platform, etc.].
        </p>
        <h3>Future Plans</h3>
        <p>
          We plan to expand our project with new features and innovations, including [example of future features such as new NFT launches, additional game features, strategic partnerships, etc.].
        </p>
        <p>Our goal is to create a unique experience and add value to our community.</p>
      </div>
    </div>
  );
};

export default About;
