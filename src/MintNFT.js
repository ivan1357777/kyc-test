// MintNFT.js
import React, { useState } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

const MintNFT = () => {
    const [amount, setAmount] = useState(0);

    const mintNFT = async () => {
        // Logic to interact with the NFT minting smart contract
    };

    return (
        <div>
            <h1>Mint NFT</h1>
            <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />
            <button onClick={mintNFT}>Mint NFT</button>
        </div>
    );
};

export default MintNFT;
