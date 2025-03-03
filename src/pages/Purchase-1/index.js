import React, { useState } from 'react';
import './purchase.css';

const About = () => {
  const [amount, setAmount] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const handleMinting = async () => {
    try {
      // Check if Phantom wallet is connected
      const isPhantomInstalled = window.solana && window.solana.isPhantom;
      if (!isPhantomInstalled) {
        alert('Please install Phantom Wallet!');
        return;
      }

      const solana = window.solana;
      await solana.connect();

      // Initiate minting process with the entered amount of SOL
      const mintingTransaction = await mintTokens(amount);

      if (mintingTransaction) {
        setConfirmationMessage('Minting successful!');
      }
    } catch (error) {
      console.error('Minting failed:', error);
      setConfirmationMessage('Minting failed. Please try again.');
    }
  };

  const mintTokens = (amount) => {
    // Placeholder function for minting logic
    // This function should include your minting logic, which interacts with the blockchain
    return new Promise((resolve) => setTimeout(resolve, 2000)); // Simulating a successful transaction
  };

  return (
    <div className="purchase-page">
      <div className="purchase-container">
        <h1>Purchase</h1>
        <p>Buy our token using SOL cryptocurrency</p>
        <h4>How to Buy the Token</h4>
        <p>
          To purchase [Token Name] from us, use your Phantom wallet. The process is simple and quick. For every 0.1 SOL paid, you will receive 100,000 of our tokens.
        </p>
        <h1>Minting Process</h1>
        <p>
          Enter the amount of SOL you wish to spend below to mint our tokens. For example, if you pay 0.1 SOL, you will receive 100,000 tokens.
        </p>

        {/* Form for entering SOL amount and minting tokens */}
        <div className="mint-form">
          <div className="mb-4">
            <label htmlFor="amount" className="block text-lg font-medium">
              Amount of SOL
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2 p-2 border border-gray-300 rounded-md"
              placeholder="Enter amount in SOL"
            />
          </div>

          <button
            onClick={handleMinting}
            className="mt-4 px-6 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition duration-300"
          >
            Mint Tokens Now
          </button>

          {confirmationMessage && (
            <div className="mt-4 text-center text-lg font-semibold text-green-500">
              {confirmationMessage}
            </div>
          )}

          <h1>Transaction Status</h1>
          <p>
            Once you have completed the minting process, a confirmation message will appear here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
