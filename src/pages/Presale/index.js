import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./presale.css";

const Presale = () => {
  const [timeLeft, setTimeLeft] = useState({});
  const [tokensSold, setTokensSold] = useState(350000);
  const totalTokens = 1700000000;
  const presaleEnd = new Date("2024-12-31T23:59:59").getTime();

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const timeRemaining = presaleEnd - now;

      if (timeRemaining <= 0) {
        clearInterval(timer);
        setTimeLeft({});
      } else {
        setTimeLeft({
          days: Math.floor(timeRemaining / (1000 * 60 * 60 * 24)),
          hours: Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((timeRemaining % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [presaleEnd]);

  const handleBuyTokens = async () => {
    const amount = 0.1; // Example amount per purchase
    try {
      console.log(`Buying SNV2 with ${amount} ...`);
      setTokensSold((prev) => prev + 10000);
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  const handleShareTwitter = () => {
    const tweetText = encodeURIComponent(
      "Join the SNV2 Revolution – Limited Presale Live Now! Buy now: mysin.io"
    );
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, "_blank");
  };

  const navigate = useNavigate();
  const close = () => navigate("/");

  return (
    <div className="presale-page">
      <span className="close-btn-presale" onClick={close}>
        <span role="img" aria-label="close icon">❌</span>
      </span>
      <section className="hero-section">
        <h1>Join the SNV2 Revolution – Limited Presale Live Now!</h1>
        <p>
          Buy SNV2 tokens now and be part of the future of good deeds & crypto rewards.
        </p>
        <div className="countdown">
          <h2>Presale Ends In:</h2>
          <p>
            {timeLeft.days || 0}d {timeLeft.hours || 0}h {timeLeft.minutes || 0}m{" "}
            {timeLeft.seconds || 0}s
          </p>
        </div>
        <div className="progress-container">
          <label>
            Presale Progress: {tokensSold} / {totalTokens} Tokens Sold
          </label>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(tokensSold / totalTokens) * 100}%` }}
            ></div>
          </div>
        </div>
        <button onClick={handleBuyTokens} className="btn">
          Buy SNV2 Now
        </button>
      </section>
      <section className="security-section">
        <h2>Security & Anti-Whale Measures</h2>
        <ul>
          <li>
            <span role="img" aria-label="check mark">✅</span> Limit of 1 purchase per IP and per wallet.
          </li>
          <li>
            <span role="img" aria-label="check mark">✅</span> Blacklist system for fraudulent activities.
          </li>
          <li>
            <span role="img" aria-label="check mark">✅</span> LP Lock: Liquidity is locked for 1 year after presale completion.
          </li>
        </ul>
      </section>
      <section className="referral-section">
        <h2>Social Media & Referral Program</h2>
        <ul>
          <li>
            <span role="img" aria-label="check mark">✅</span> Live counter shows the percentage of SNV2 sold.
          </li>
          <li>
            <span role="img" aria-label="check mark">✅</span> Early buyers gain Whitelist Access through our Referral System.
          </li>
        </ul>
        <button onClick={handleShareTwitter} className="share-button btn">
          Share on Twitter
        </button>
      </section>
      <footer className="presale-footer">
        <p>
          <span role="img" aria-label="warning">⚠️</span> Always verify the official contract address before making any transaction. Crypto investments are high-risk.
        </p>
      </footer>
    </div>
  );
};

export default Presale;
