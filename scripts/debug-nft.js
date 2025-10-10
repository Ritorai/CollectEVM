const { Connection, PublicKey } = require("@solana/web3.js");

async function debugNFT() {
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const mintAddress = "HgiyykEXv2k5w9dEnQr5L4JCSf5Ar9npYR7VMvihZmmV";
  
  try {
    console.log(`🔍 Debugging NFT: ${mintAddress}`);
    
    // Get the metadata PDA (Program Derived Address)
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        new PublicKey(mintAddress).toBuffer(),
      ],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );
    
    console.log(`📋 Metadata PDA: ${metadataPDA.toString()}`);
    
    // Get the metadata account
    const metadataAccount = await connection.getAccountInfo(metadataPDA);
    
    if (!metadataAccount) {
      console.log("❌ No metadata account found");
      return;
    }
    
    console.log("✅ Metadata account found!");
    console.log(`📊 Account data length: ${metadataAccount.data.length} bytes`);
    
    // Try to parse the metadata (this is a simplified approach)
    const data = metadataAccount.data;
    
    // Look for collection information in the raw data
    console.log("🔍 Looking for collection info in metadata...");
    
    // The collection is usually at a specific offset in the metadata
    // This is a simplified check - in production you'd use proper Metaplex parsing
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

debugNFT();
