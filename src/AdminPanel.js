// AdminPanel.js
import React, { useState } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

const AdminPanel = () => {
    const [amount, setAmount] = useState(0);

    const distributeRewards = async () => {
        // Logic to interact with the rewards smart contract
    };

    return (
        <div>
            <h1>Admin Control Panel</h1>
            <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />
            <button onClick={distributeRewards}>Distribute Rewards</button>
        </div>
    );
};

export default AdminPanel;
