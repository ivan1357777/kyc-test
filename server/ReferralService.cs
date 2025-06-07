// ReferralService.cs
public class ReferralService
{
    private readonly ApplicationDbContext _db;
    private readonly SolanaService _solanaService;
    private readonly ILogger<ReferralService> _logger;

    public ReferralService(ApplicationDbContext db, SolanaService solanaService, ILogger<ReferralService> logger)
    {
        _db = db;
        _solanaService = solanaService;
        _logger = logger;
    }

    public async Task RegisterReferral(string referrerCode, string newUserWallet)
    {
        try
        {
            var referrer = await _db.Users.FirstOrDefaultAsync(u => u.ReferralCode == referrerCode);
            if (referrer != null)
            {
                _db.Referrals.Add(new Referral 
                { 
                    ReferrerId = referrer.Id, 
                    ReferredWallet = newUserWallet,
                    CreatedAt = DateTime.UtcNow,
                    RewardClaimed = false
                });
                await _db.SaveChangesAsync();
                _logger.LogInformation($"Registered referral: {referrerCode} -> {newUserWallet}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering referral");
            throw;
        }
    }

    public async Task ProcessRewards()
    {
        try
        {
            // Get all eligible referrals (not yet rewarded and meet conditions)
            var eligibleReferrals = await _db.Referrals
                .Where(r => !r.RewardClaimed && r.CreatedAt > DateTime.UtcNow.AddDays(-30))
                .ToListAsync();

            foreach (var referral in eligibleReferrals)
            {
                // Get the referrer's wallet address
                var referrer = await _db.Users.FindAsync(referral.ReferrerId);
                if (referrer == null || string.IsNullOrEmpty(referrer.WalletAddress))
                {
                    _logger.LogWarning($"Referrer not found or no wallet for referral ID: {referral.Id}");
                    continue;
                }

                // Distribute rewards (1 SNV2 to both parties)
                var rewardAmount = 1 * (long)Math.Pow(10, 9); // 1 SNV2 with 9 decimals

                try
                {
                    // Reward the new user
                    await _solanaService.ClaimReward(referral.ReferredWallet, rewardAmount);
                    
                    // Reward the referrer
                    await _solanaService.ClaimReward(referrer.WalletAddress, rewardAmount);

                    // Mark as claimed
                    referral.RewardClaimed = true;
                    await _db.SaveChangesAsync();

                    _logger.LogInformation($"Rewards distributed for referral ID: {referral.Id}");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error processing reward for referral ID: {referral.Id}");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing rewards");
            throw;
        }
    }
}

// SolanaService.cs
public class SolanaService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SolanaService> _logger;
    private readonly Wallet _vaultWallet;
    private readonly Connection _connection;

    public SolanaService(IConfiguration config, ILogger<SolanaService> logger)
    {
        _config = config;
        _logger = logger;
        
        // Initialize connection and wallet
        _connection = new Connection(_config["Solana:RpcUrl"]);
        _vaultWallet = Wallet.FromJson(_config["Solana:VaultWalletJson"]);
    }

    public async Task ClaimReward(string recipientAddress, long amount)
    {
        try
        {
            // Create transaction
            var transaction = new TransactionBuilder(_connection)
                .SetRecentBlockHash((await _connection.GetRecentBlockHashAsync()).Value.Blockhash)
                .SetFeePayer(_vaultWallet.Account.PublicKey)
                .AddInstruction(new TransactionInstruction
                {
                    ProgramId = new PublicKey(_config["Solana:SmartContractProgramId"]),
                    Keys = new List<AccountMeta>
                    {
                        AccountMeta.Writable(new PublicKey(recipientAddress), false),
                        AccountMeta.Writable(new PublicKey(_config["Solana:RewardVaultAddress"]), false),
                        AccountMeta.Readonly(_vaultWallet.Account.PublicKey, true)
                    },
                    Data = new byte[] { /* Serialized instruction data for claim_reward */ }
                })
                .Build();

            // Sign and send transaction
            transaction.Sign(_vaultWallet.Account);
            var signature = await _connection.SendTransactionAsync(transaction);
            
            _logger.LogInformation($"Reward sent to {recipientAddress}. Tx: {signature}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error claiming reward for {recipientAddress}");
            throw;
        }
    }
}