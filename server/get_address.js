const fs = require('fs');
const { Keypair } = require('@solana/web3.js');

const secretKey = JSON.parse(fs.readFileSync('kyc_wallet.json'));
const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));

console.log('Vault Wallet Address:', keypair.publicKey.toString());