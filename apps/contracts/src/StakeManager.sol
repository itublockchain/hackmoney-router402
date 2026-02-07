// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title StakeManager
 * @author Route 402 Team
 * @notice Manages USDC stakes for the Route 402 decentralized AI gateway
 * @dev Users stake collateral to access LLM services. When refunding, the backend
 *      provides a signed message with the user's accumulated debt. The contract
 *      verifies the signature and splits the stake: debt goes to treasury, remainder to user.
 *
 * Key features:
 * - Fixed stake amount (3 USDC default)
 * - Signature-verified refunds with debt deduction
 * - Nonce-based replay protection
 * - Emergency pause functionality
 */
contract StakeManager is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============ Constants ============

    /// @notice USDC has 6 decimals
    uint256 public constant USDC_DECIMALS = 6;

    // ============ Storage ============

    /// @notice The USDC token contract
    IERC20 public immutable USDC;

    /// @notice Required stake amount (default 3 USDC = 3_000_000)
    uint256 public stakeAmount;

    /// @notice Address authorized to sign refund messages
    address public signer;

    /// @notice Address that receives debt payments (treasury)
    address public treasury;

    /// @notice Mapping of user address to their staked amount
    mapping(address => uint256) public stakedAmount;

    /// @notice Mapping of user address to their current nonce (replay protection)
    mapping(address => uint256) public nonces;

    // ============ Events ============

    /// @notice Emitted when a user stakes USDC
    event Staked(address indexed user, uint256 amount, uint256 timestamp);

    /// @notice Emitted when a user is refunded
    event Refunded(
        address indexed user,
        uint256 debt,
        uint256 refundAmount,
        uint256 toTreasury,
        uint256 timestamp
    );

    /// @notice Emitted when stake amount is updated
    event StakeAmountUpdated(uint256 oldAmount, uint256 newAmount);

    /// @notice Emitted when signer is updated
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);

    /// @notice Emitted when treasury is updated
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // ============ Errors ============

    /// @notice Thrown when user already has an active stake
    error AlreadyStaked();

    /// @notice Thrown when user has no active stake
    error NoActiveStake();

    /// @notice Thrown when address is zero
    error ZeroAddress();

    /// @notice Thrown when stake amount is invalid
    error InvalidStakeAmount();

    /// @notice Thrown when signature is invalid
    error InvalidSignature();

    /// @notice Thrown when debt exceeds staked amount
    error DebtExceedsStake(uint256 debt, uint256 staked);

    /// @notice Thrown when nonce is invalid
    error InvalidNonce(uint256 expected, uint256 provided);

    // ============ Constructor ============

    /**
     * @notice Initializes the StakeManager contract
     * @param _usdc Address of the USDC token contract
     * @param _owner Address of the contract owner
     * @param _signer Address authorized to sign refund messages
     * @param _treasury Address to receive debt payments
     * @param _stakeAmount Initial required stake amount (in USDC wei, 6 decimals)
     */
    constructor(
        address _usdc,
        address _owner,
        address _signer,
        address _treasury,
        uint256 _stakeAmount
    ) Ownable(_owner) {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_signer == address(0)) revert ZeroAddress();
        if (_treasury == address(0)) revert ZeroAddress();
        if (_stakeAmount == 0) revert InvalidStakeAmount();

        USDC = IERC20(_usdc);
        signer = _signer;
        treasury = _treasury;
        stakeAmount = _stakeAmount;
    }

    // ============ External Functions ============

    /**
     * @notice Stakes the required USDC amount to access the AI gateway
     * @dev User must approve this contract to spend USDC before calling
     */
    function stake() external nonReentrant whenNotPaused {
        if (stakedAmount[msg.sender] > 0) revert AlreadyStaked();

        stakedAmount[msg.sender] = stakeAmount;

        USDC.safeTransferFrom(msg.sender, address(this), stakeAmount);

        emit Staked(msg.sender, stakeAmount, block.timestamp);
    }

    /**
     * @notice Refunds the user's stake minus their debt
     * @param debt The accumulated debt amount (signed by backend)
     * @param nonce The nonce for replay protection
     * @param signature Backend signature authorizing the refund
     * @dev The signature must be from the authorized signer over (user, debt, nonce, chainId,
     * contract)
     */
    function refund(uint256 debt, uint256 nonce, bytes calldata signature)
        external
        nonReentrant
        whenNotPaused
    {
        uint256 staked = stakedAmount[msg.sender];
        if (staked == 0) revert NoActiveStake();

        // Verify nonce
        if (nonce != nonces[msg.sender]) {
            revert InvalidNonce(nonces[msg.sender], nonce);
        }

        // Verify debt doesn't exceed stake
        if (debt > staked) {
            revert DebtExceedsStake(debt, staked);
        }

        // Verify signature
        bytes32 messageHash = getMessageHash(msg.sender, debt, nonce);
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);

        if (recoveredSigner != signer) {
            revert InvalidSignature();
        }

        // Update state
        stakedAmount[msg.sender] = 0;
        nonces[msg.sender]++;

        // Calculate amounts
        uint256 refundAmount = staked - debt;

        // Transfer debt to treasury
        if (debt > 0) {
            USDC.safeTransfer(treasury, debt);
        }

        // Transfer refund to user
        if (refundAmount > 0) {
            USDC.safeTransfer(msg.sender, refundAmount);
        }

        emit Refunded(msg.sender, debt, refundAmount, debt, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Checks if a user has an active stake
     * @param user Address of the user
     * @return hasActiveStake Whether user has staked
     */
    function isStaked(address user) external view returns (bool hasActiveStake) {
        return stakedAmount[user] > 0;
    }

    /**
     * @notice Generates the message hash for signature verification
     * @param user Address of the user
     * @param debt The debt amount
     * @param nonce The nonce value
     * @return The message hash
     */
    function getMessageHash(address user, uint256 debt, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(user, debt, nonce, block.chainid, address(this)));
    }

    // ============ Admin Functions ============

    /**
     * @notice Updates the required stake amount
     * @param newAmount New stake amount (in USDC wei)
     * @dev Only callable by owner. Does not affect existing stakes.
     */
    function setStakeAmount(uint256 newAmount) external onlyOwner {
        if (newAmount == 0) revert InvalidStakeAmount();
        emit StakeAmountUpdated(stakeAmount, newAmount);
        stakeAmount = newAmount;
    }

    /**
     * @notice Updates the authorized signer
     * @param newSigner New signer address
     * @dev Only callable by owner
     */
    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        emit SignerUpdated(signer, newSigner);
        signer = newSigner;
    }

    /**
     * @notice Updates the treasury address
     * @param newTreasury New treasury address
     * @dev Only callable by owner
     */
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /**
     * @notice Pauses the contract
     * @dev Only callable by owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses the contract
     * @dev Only callable by owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdrawal of all USDC
     * @param recipient Address to receive the funds
     * @dev Only callable by owner when paused
     */
    function emergencyWithdraw(address recipient) external onlyOwner whenPaused nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();

        uint256 balance = USDC.balanceOf(address(this));
        if (balance > 0) {
            USDC.safeTransfer(recipient, balance);
        }
    }
}
