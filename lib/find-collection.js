// Temporary script to find the collection address from your NFT
const { Connection, PublicKey } = require('@solana/web3.js');

async function findCollectionAddress() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const mintAddress = 'HgiyykEXv2k5w9dEnQr5L4JCSf5Ar9npYR7VMvihZmmV';
  
  try {
    // Get the mint account
    const mintAccount = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
    console.log('Mint Account:', JSON.stringify(mintAccount.value?.data, null, 2));
    
    // Get token accounts for this mint
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey('YOUR_WALLET_ADDRESS'), // Replace with your wallet address
      { mint: new PublicKey(mintAddress) }
    );
    
    console.log('Token Accounts:', JSON.stringify(tokenAccounts.value, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findCollectionAddress();
