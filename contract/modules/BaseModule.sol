// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../SoulboundBadge.sol";
import "../GmeowNFT.sol";
import "../interfaces/ICoreContract.sol";
import "../interfaces/IScoringModule.sol";

/**
 * @title BaseModule
 * @notice Shared errors, events, structs, and state variables for all modules
 * @dev All modules inherit from this to share common data structures
 * @dev ENHANCED: Supports both proxy and standalone architectures via cross-contract helpers
 */
abstract contract BaseModule is Ownable2Step, Pausable, ReentrancyGuard {
  using ECDSA for bytes32;
  using SafeERC20 for IERC20;

  // ============ CUSTOM ERRORS ============
  error QuestNotActive();
  error MaxCompletionsReached();
  error QuestExpired();
  error SignatureExpired();
  error InvalidNonce();
  error InvalidOracleSignature();
  error InsufficientPoints();
  error InsufficientLockedPoints();
  error TokenNotWhitelisted();
  error ZeroAddressNotAllowed();
  error ZeroAmountNotAllowed();
  error EmptyArray();
  error TimelockActive();
  error AlreadyCompleted();
  error InsufficientEscrow();
  error InsufficientReserve();
  error AlreadyMigrated();
  error MigrationNotEnabled();
  error MigrationTargetNotSet();
  error GMCooldownActive();
  error NFTMintPaused();
  error NotOnAllowlist();
  error SupplyLimitReached();
  error InsufficientPayment();
  error AlreadyMinted();
  error RequirementNotMet();
  error ValueOutOfRange();
  error NoPendingOracleChange();

  // ============ EVENTS ============
  event QuestAdded(uint256 indexed questId, address indexed creator, uint8 questType, uint256 rewardPerUserPoints, uint256 maxCompletions);
  event QuestAddedERC20(uint256 indexed questId, address indexed creator, address token, uint256 rewardPerUserToken, uint256 maxCompletions);
  event QuestClosed(uint256 indexed questId);
  event QuestCompleted(uint256 indexed questId, address indexed user, uint256 pointsAwarded, uint256 fid, address rewardToken, uint256 tokenAmount);
  event PointsDeposited(address indexed who, uint256 amount);
  event PointsWithdrawn(address indexed who, uint256 amount);
  event PointsTipped(address indexed from, address indexed to, uint256 points, uint256 fid);
  event BadgeMinted(address indexed to, uint256 indexed tokenId, string badgeType);
  event FIDLinked(address indexed who, uint256 fid);
  event OracleSignerUpdated(address indexed newSigner);
  event OracleAuthorized(address indexed oracle, bool authorized);
  event PowerBadgeSet(uint256 indexed fid, bool hasPowerBadge);
  event StakedForBadge(address indexed who, uint256 points, uint256 badgeId);
  event UnstakedForBadge(address indexed who, uint256 points, uint256 badgeId);
  event ERC20EscrowDeposited(uint256 indexed questId, address indexed token, uint256 amount);
  event ERC20Payout(uint256 indexed questId, address indexed to, address token, uint256 amount);
  event ERC20Refund(uint256 indexed questId, address indexed to, address token, uint256 amount);
  event TokenWhitelisted(address indexed token, bool enabled);
  event GMEvent(address indexed user, uint256 rewardPoints, uint256 newStreak);
  event GMSent(address indexed user, uint256 streak, uint256 pointsEarned);
  event NFTMinted(address indexed to, uint256 indexed tokenId, string nftTypeId, string metadataURI, string reason);
  event NFTMintConfigUpdated(string indexed nftTypeId, uint256 paymentAmount, uint256 maxSupply);
  event NFTMintPaymentReceived(address indexed from, uint256 amount, string nftTypeId);
  event NFTContractUpdated(address indexed nftContract);
  event OnchainQuestAdded(uint256 indexed questId, uint8 onchainType, address indexed asset, uint256 minAmount);
  event OnchainQuestCompleted(uint256 indexed questId, address indexed user, uint256 pointsAwarded);
  event MigrationTargetSet(address indexed newTarget, uint256 activationTime);
  event MigrationEnabled(bool enabled);
  event UserMigrated(address indexed user, address indexed newContract, uint256 points, uint256 lockedPoints);
  event TimelockActionScheduled(bytes32 indexed actionId, uint256 executeTime);
  event TimelockActionExecuted(bytes32 indexed actionId);
  event OracleChangeScheduled(address indexed newSigner, uint256 executeTime);
  event NonceIncremented(address indexed user, uint256 newNonce);

  // ============ STRUCTS ============
  struct Quest {
    string name;
    uint8 questType;
    uint256 target;
    uint256 rewardPoints;
    address creator;
    uint256 maxCompletions;
    uint256 expiresAt;
    string meta;
    bool isActive;
    uint256 escrowedPoints;
    uint256 claimedCount;
    address rewardToken;
    uint256 rewardTokenPerUser;
    uint256 tokenEscrowRemaining;
  }

  struct UserProfile {
    string name;
    string bio;
    string twitter;
    string pfpUrl;
    uint256 joinDate;
    bool hasCustomProfile;
    uint256 farcasterFid;
  }

  struct NFTMintConfig {
    bool requiresPayment;
    uint256 paymentAmount;
    bool allowlistRequired;
    bool paused;
    uint256 maxSupply;
    uint256 currentSupply;
    string baseMetadataURI;
  }

  enum OnchainQuestType {
    ERC20_BALANCE,
    ERC721_OWNERSHIP,
    STAKE_POINTS,
    HOLD_BADGE
  }

  struct OnchainRequirement {
    address asset;
    uint256 minAmount;
    uint8 requirementType;
  }

  struct OnchainQuest {
    uint256 baseQuestId;
    OnchainRequirement[] requirements;
    mapping(address => bool) completed;
  }

  // ============ STATE VARIABLES ============
  uint256 internal _nextQuestId;
  mapping(uint256 => Quest) public quests;
  uint256[] public activeQuestIds;

  mapping(address => uint256) public pointsBalance;
  mapping(address => uint256) public pointsLocked;
  mapping(uint256 => uint256) public fidPoints;

  mapping(address => UserProfile) public userProfiles;
  mapping(address => uint256) public userTotalEarned;

  mapping(address => uint256) public farcasterFidOf;
  mapping(uint256 => bool) public powerBadge;
  uint256 public constant OG_THRESHOLD = 50_000;

  address public oracleSigner;
  mapping(address => bool) public authorizedOracles;
  SoulboundBadge public badgeContract;
  GmeowNFT public nftContract;

  /// @notice On-chain scoring module - single source of truth for all points
  IScoringModule public scoringModule;

  function setBadgeContract(address _badge) external onlyOwner {
    require(_badge != address(0), "Invalid address");
    badgeContract = SoulboundBadge(_badge);
  }

  /**
   * @notice Set the scoring module address (callable by all inheriting modules)
   * @param _scoringModule Address of deployed ScoringModule
   */
  function setScoringModule(address _scoringModule) external onlyOwner {
    require(_scoringModule != address(0), "Zero address not allowed");
    scoringModule = IScoringModule(_scoringModule);
  }

  mapping(address => mapping(uint256 => uint256)) public stakedForBadge;
  mapping(address => uint256) public userNonce;

  uint256 public contractPointsReserve;

  mapping(address => uint256) public tokenBalances;
  mapping(address => bool) public tokenWhitelist;
  bool public tokenWhitelistEnabled = true;

  // GM state
  uint256 public gmPointReward = 10;
  uint256 public gmCooldown = 1 days;
  mapping(address => uint256) public lastGMTime;
  mapping(address => uint256) public gmStreak;
  uint16 public streak7BonusPct = 15;
  uint16 public streak30BonusPct = 30;
  uint16 public streak100BonusPct = 60;

  // NFT state
  mapping(string => NFTMintConfig) public nftMintConfigs;
  mapping(string => mapping(address => bool)) public hasMinedNFT;
  mapping(string => mapping(address => bool)) public nftMintAllowlist;

  // Onchain quest state
  mapping(uint256 => OnchainQuest) public onchainQuests;
  uint256[] public onchainQuestIds;

  // Migration state
  address public migrationTarget;
  bool public migrationEnabled;
  uint256 public migrationActivationTime;
  mapping(address => bool) public hasMigrated;

  // Timelock state
  uint256 public constant ADMIN_TIMELOCK = 2 days;
  uint256 public constant QUEST_CLOSURE_TIMELOCK = 1 days;
  address public pendingOracleSigner;
  uint256 public oracleChangeTime;
  mapping(bytes32 => uint256) public timelockActions;

  // ============ MODIFIERS ============
  modifier onlyActiveQuest(uint256 questId) {
    if (!quests[questId].isActive) revert QuestNotActive();
    _;
  }
  
  modifier onlyAuthorized() virtual {
    require(msg.sender == owner(), "Not authorized");
    _;
  }
  
  modifier onlyOracle() {
    require(authorizedOracles[msg.sender], "Not oracle");
    _;
  }

  // ============ INTERNAL HELPERS ============

  /**
   * @notice Get core contract address for standalone deployments
   * @dev Override this in standalone contracts (Guild, NFT, etc.)
   * @return Core contract address, or address(0) for proxy deployments
   */
  function _getCoreContract() internal view virtual returns (address) {
    return address(0); // Default: proxy deployment (no external core)
  }
  
  /**
   * @notice Check if this is a standalone deployment
   * @return True if standalone, false if proxy
   */
  function _isStandalone() internal view returns (bool) {
    address core = _getCoreContract();
    return core != address(0) && core != address(this);
  }
  
  /**
   * @notice Get user's total score from ScoringModule
   * @param user Address to check
   * @return Total score from ScoringModule
   */
  function _getUserPoints(address user) internal view returns (uint256) {
    if (address(scoringModule) == address(0)) {
      return 0;  // Not initialized yet
    }
    return scoringModule.totalScore(user);
  }
  
  /**
   * @notice Deduct points from user via ScoringModule
   * @param from Address to deduct from
   * @param amount Amount to deduct
   */
  function _deductPoints(address from, uint256 amount) internal {
    if (address(scoringModule) != address(0)) {
      scoringModule.deductPoints(from, amount, "Points deducted");
    } else {
      revert("ScoringModule not set");
    }
  }
  
  /**
   * @notice Add points to user via ScoringModule
   * @param to Address to add to
   * @param amount Amount to add
   * @dev Uses generic addPoints - modules should call specific functions when possible
   */
  function _addPoints(address to, uint256 amount) internal {
    if (address(scoringModule) != address(0)) {
      scoringModule.addPoints(to, amount);
    }
  }

  function burnPoints(address from, uint256 amount) internal {
    if (pointsBalance[from] < amount) revert InsufficientPoints();
    pointsBalance[from] -= amount;
  }

  function _uint2str(uint256 _i) internal pure returns (string memory) {
    if (_i == 0) return "0";
    uint256 j = _i;
    uint256 len;
    while (j != 0) { len++; j /= 10; }
    bytes memory b = new bytes(len);
    while (_i != 0) {
      b[--len] = bytes1(uint8(48 + _i % 10));
      _i /= 10;
    }
    return string(b);
  }

  function _validateGuildId(uint256 guildId, uint256 maxId) internal pure {
    require(guildId > 0 && guildId <= maxId, "E004");
  }

  function _validateAddress(address addr) internal pure {
    require(addr != address(0), "E025");
  }

  function _validateAmount(uint256 amount) internal pure {
    require(amount > 0, "E026");
  }
}
