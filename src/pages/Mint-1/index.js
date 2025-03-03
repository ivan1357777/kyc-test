import React from 'react';
import './mint.css';

const About = () => {
  return (
    <div className="mint-page">
      <div className="mint-container">
        <h1>Minting NFT's</h1>
        <h4>Explore and Mint Our Exclusive NFT's</h4>
        <h3>Available NFTs</h3>
        <p>
          We offer three unique NFTs that you can mint directly from our platform. Each NFT provides different benefits and comes with its own set of features.
        </p>

        {/* NFT 1 Section */}
        <div className="nft-item">
          <div className="nft-image">
            <img src="nft1.jpg" alt="NFT 1" />
            <div className="nft-info">
              <h4>NFT 1 - Badge Pass</h4>
              <p>Price: 0.025 SOL</p>
              <p>Benefits: This NFT grants you access to [specific benefits or features].</p>
            </div>
          </div>
          <button className="mint-btn">Mint Now</button>
        </div>

        {/* NFT 2 Section */}
        <div className="nft-item">
          <div className="nft-image">
            <img src="nft2.jpg" alt="NFT 2" />
            <div className="nft-info">
              <h4>NFT 2 - Exclusive Game Pass</h4>
              <p>Price: 2.5 SOL</p>
              <p>Benefits: This NFT provides access to any game exclusively.</p>
            </div>
          </div>
          <button className="mint-btn">Mint Now</button>
        </div>

        {/* NFT 3 Section */}
        <div className="nft-item">
          <div className="nft-image">
            <img src="nft3.jpg" alt="NFT 3" />
            <div className="nft-info">
              <h4>NFT 3 - Special Badge</h4>
              <p>Price: 0.05 SOL</p>
              <p>Benefits: This NFT is a special badge that grants [specific benefits].</p>
            </div>
          </div>
          <button className="mint-btn">Mint Now</button>
        </div>

        {/* Minting Functionality Section */}
        <h3>Mint Your NFTs</h3>
        <p>
          To mint any of these NFTs, click the 'Mint Now' button associated with the NFT you wish to purchase. The process will connect to your Phantom wallet and complete the transaction.
        </p>
        <p>Ensure you have enough SOL in your wallet to cover the cost of the NFT.</p>

        <h3>Future Plans</h3>
        <p>
          We plan to expand our project with new features and innovations, including [example of future features such as new NFT launches, additional game features, strategic partnerships, etc.].
        </p>
        <p>Our goal is to create a unique experience and add value to our community.</p>

        <h3>Gallery</h3>
        <p>Explore some representative images of our project.</p>
      </div>
    </div>
  );
};

export default About;
