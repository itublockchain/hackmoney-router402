// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { StakeManager } from "../src/StakeManager.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @notice Mock USDC token for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") { }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract StakeManagerTest is Test {
    using MessageHashUtils for bytes32;

    StakeManager public stakeManager;
    MockUSDC public usdc;

    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");

    uint256 public signerPrivateKey = 0xA11CE;
    address public signerAddress;

    uint256 public constant STAKE_AMOUNT = 3_000_000; // 3 USDC

    // ============ Events ============

    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Refunded(
        address indexed user,
        uint256 debt,
        uint256 refundAmount,
        uint256 toTreasury,
        uint256 timestamp
    );
    event StakeAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    function setUp() public {
        // Get signer address from private key
        signerAddress = vm.addr(signerPrivateKey);

        // Deploy mock USDC
        usdc = new MockUSDC();

        // Deploy StakeManager
        vm.prank(owner);
        stakeManager = new StakeManager(address(usdc), owner, signerAddress, treasury, STAKE_AMOUNT);

        // Mint USDC to users
        usdc.mint(user1, 100_000_000); // 100 USDC
        usdc.mint(user2, 100_000_000); // 100 USDC

        // Approve stakeManager
        vm.prank(user1);
        usdc.approve(address(stakeManager), type(uint256).max);

        vm.prank(user2);
        usdc.approve(address(stakeManager), type(uint256).max);
    }

    // ============ Helper Functions ============

    function _signRefund(address user, uint256 debt, uint256 nonce)
        internal
        view
        returns (bytes memory signature)
    {
        bytes32 messageHash = stakeManager.getMessageHash(user, debt, nonce);
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedHash);
        signature = abi.encodePacked(r, s, v);
    }

    // ============ Constructor Tests ============

    function test_Constructor() public view {
        assertEq(address(stakeManager.USDC()), address(usdc));
        assertEq(stakeManager.stakeAmount(), STAKE_AMOUNT);
        assertEq(stakeManager.owner(), owner);
        assertEq(stakeManager.signer(), signerAddress);
        assertEq(stakeManager.treasury(), treasury);
    }

    function test_Constructor_RevertZeroUSDC() public {
        vm.expectRevert(StakeManager.ZeroAddress.selector);
        new StakeManager(address(0), owner, signerAddress, treasury, STAKE_AMOUNT);
    }

    function test_Constructor_RevertZeroSigner() public {
        vm.expectRevert(StakeManager.ZeroAddress.selector);
        new StakeManager(address(usdc), owner, address(0), treasury, STAKE_AMOUNT);
    }

    function test_Constructor_RevertZeroTreasury() public {
        vm.expectRevert(StakeManager.ZeroAddress.selector);
        new StakeManager(address(usdc), owner, signerAddress, address(0), STAKE_AMOUNT);
    }

    function test_Constructor_RevertZeroStakeAmount() public {
        vm.expectRevert(StakeManager.InvalidStakeAmount.selector);
        new StakeManager(address(usdc), owner, signerAddress, treasury, 0);
    }

    // ============ Stake Tests ============

    function test_Stake() public {
        uint256 balanceBefore = usdc.balanceOf(user1);

        vm.expectEmit(true, false, false, true);
        emit Staked(user1, STAKE_AMOUNT, block.timestamp);

        vm.prank(user1);
        stakeManager.stake();

        assertEq(stakeManager.stakedAmount(user1), STAKE_AMOUNT);
        assertTrue(stakeManager.isStaked(user1));

        assertEq(usdc.balanceOf(user1), balanceBefore - STAKE_AMOUNT);
        assertEq(usdc.balanceOf(address(stakeManager)), STAKE_AMOUNT);
    }

    function test_Stake_RevertAlreadyStaked() public {
        vm.prank(user1);
        stakeManager.stake();

        vm.expectRevert(StakeManager.AlreadyStaked.selector);
        vm.prank(user1);
        stakeManager.stake();
    }

    function test_Stake_RevertWhenPaused() public {
        vm.prank(owner);
        stakeManager.pause();

        vm.expectRevert();
        vm.prank(user1);
        stakeManager.stake();
    }

    // ============ Refund Tests ============

    function test_Refund_NoDebt() public {
        vm.prank(user1);
        stakeManager.stake();

        uint256 debt = 0;
        uint256 nonce = 0;
        bytes memory signature = _signRefund(user1, debt, nonce);

        uint256 userBalanceBefore = usdc.balanceOf(user1);
        uint256 treasuryBalanceBefore = usdc.balanceOf(treasury);

        vm.expectEmit(true, false, false, true);
        emit Refunded(user1, debt, STAKE_AMOUNT, debt, block.timestamp);

        vm.prank(user1);
        stakeManager.refund(debt, nonce, signature);

        assertEq(stakeManager.stakedAmount(user1), 0);
        assertFalse(stakeManager.isStaked(user1));
        assertEq(stakeManager.nonces(user1), 1);

        assertEq(usdc.balanceOf(user1), userBalanceBefore + STAKE_AMOUNT);
        assertEq(usdc.balanceOf(treasury), treasuryBalanceBefore);
    }

    function test_Refund_WithDebt() public {
        vm.prank(user1);
        stakeManager.stake();

        uint256 debt = 1_000_000; // 1 USDC debt
        uint256 nonce = 0;
        bytes memory signature = _signRefund(user1, debt, nonce);

        uint256 userBalanceBefore = usdc.balanceOf(user1);
        uint256 treasuryBalanceBefore = usdc.balanceOf(treasury);
        uint256 expectedRefund = STAKE_AMOUNT - debt;

        vm.expectEmit(true, false, false, true);
        emit Refunded(user1, debt, expectedRefund, debt, block.timestamp);

        vm.prank(user1);
        stakeManager.refund(debt, nonce, signature);

        assertEq(usdc.balanceOf(user1), userBalanceBefore + expectedRefund);
        assertEq(usdc.balanceOf(treasury), treasuryBalanceBefore + debt);
    }

    function test_Refund_FullDebt() public {
        vm.prank(user1);
        stakeManager.stake();

        uint256 debt = STAKE_AMOUNT; // Full stake as debt
        uint256 nonce = 0;
        bytes memory signature = _signRefund(user1, debt, nonce);

        uint256 userBalanceBefore = usdc.balanceOf(user1);
        uint256 treasuryBalanceBefore = usdc.balanceOf(treasury);

        vm.prank(user1);
        stakeManager.refund(debt, nonce, signature);

        assertEq(usdc.balanceOf(user1), userBalanceBefore); // No refund
        assertEq(usdc.balanceOf(treasury), treasuryBalanceBefore + STAKE_AMOUNT);
    }

    function test_Refund_RevertNoActiveStake() public {
        uint256 debt = 0;
        uint256 nonce = 0;
        bytes memory signature = _signRefund(user1, debt, nonce);

        vm.expectRevert(StakeManager.NoActiveStake.selector);
        vm.prank(user1);
        stakeManager.refund(debt, nonce, signature);
    }

    function test_Refund_RevertInvalidNonce() public {
        vm.prank(user1);
        stakeManager.stake();

        uint256 debt = 0;
        uint256 wrongNonce = 1; // Should be 0
        bytes memory signature = _signRefund(user1, debt, wrongNonce);

        vm.expectRevert(abi.encodeWithSelector(StakeManager.InvalidNonce.selector, 0, wrongNonce));
        vm.prank(user1);
        stakeManager.refund(debt, wrongNonce, signature);
    }

    function test_Refund_RevertDebtExceedsStake() public {
        vm.prank(user1);
        stakeManager.stake();

        uint256 debt = STAKE_AMOUNT + 1; // More than staked
        uint256 nonce = 0;
        bytes memory signature = _signRefund(user1, debt, nonce);

        vm.expectRevert(
            abi.encodeWithSelector(StakeManager.DebtExceedsStake.selector, debt, STAKE_AMOUNT)
        );
        vm.prank(user1);
        stakeManager.refund(debt, nonce, signature);
    }

    function test_Refund_RevertInvalidSignature() public {
        vm.prank(user1);
        stakeManager.stake();

        uint256 debt = 1_000_000;
        uint256 nonce = 0;

        // Sign with wrong private key
        uint256 wrongPrivateKey = 0xBAD;
        bytes32 messageHash = stakeManager.getMessageHash(user1, debt, nonce);
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, ethSignedHash);
        bytes memory wrongSignature = abi.encodePacked(r, s, v);

        vm.expectRevert(StakeManager.InvalidSignature.selector);
        vm.prank(user1);
        stakeManager.refund(debt, nonce, wrongSignature);
    }

    function test_Refund_RevertReplayAttack() public {
        vm.prank(user1);
        stakeManager.stake();

        uint256 debt = 0;
        uint256 nonce = 0;
        bytes memory signature = _signRefund(user1, debt, nonce);

        // First refund succeeds
        vm.prank(user1);
        stakeManager.refund(debt, nonce, signature);

        // User stakes again
        vm.prank(user1);
        stakeManager.stake();

        // Try to replay the same signature - should fail because nonce incremented
        vm.expectRevert(abi.encodeWithSelector(StakeManager.InvalidNonce.selector, 1, nonce));
        vm.prank(user1);
        stakeManager.refund(debt, nonce, signature);
    }

    function test_Refund_RevertWhenPaused() public {
        vm.prank(user1);
        stakeManager.stake();

        vm.prank(owner);
        stakeManager.pause();

        uint256 debt = 0;
        uint256 nonce = 0;
        bytes memory signature = _signRefund(user1, debt, nonce);

        vm.expectRevert();
        vm.prank(user1);
        stakeManager.refund(debt, nonce, signature);
    }

    // ============ Restake Tests ============

    function test_Restake_AfterRefund() public {
        // First stake
        vm.prank(user1);
        stakeManager.stake();

        // Refund
        bytes memory signature = _signRefund(user1, 0, 0);
        vm.prank(user1);
        stakeManager.refund(0, 0, signature);

        // Stake again
        vm.prank(user1);
        stakeManager.stake();

        assertTrue(stakeManager.isStaked(user1));
        assertEq(stakeManager.nonces(user1), 1); // Nonce incremented
    }

    // ============ View Function Tests ============

    function test_IsStaked() public {
        assertFalse(stakeManager.isStaked(user1));

        vm.prank(user1);
        stakeManager.stake();

        assertTrue(stakeManager.isStaked(user1));

        bytes memory signature = _signRefund(user1, 0, 0);
        vm.prank(user1);
        stakeManager.refund(0, 0, signature);

        assertFalse(stakeManager.isStaked(user1));
    }

    function test_GetMessageHash() public view {
        bytes32 hash = stakeManager.getMessageHash(user1, 1_000_000, 0);
        bytes32 expected = keccak256(
            abi.encodePacked(
                user1, uint256(1_000_000), uint256(0), block.chainid, address(stakeManager)
            )
        );
        assertEq(hash, expected);
    }

    // ============ Admin Function Tests ============

    function test_SetStakeAmount() public {
        uint256 newAmount = 5_000_000; // 5 USDC

        vm.expectEmit(false, false, false, true);
        emit StakeAmountUpdated(STAKE_AMOUNT, newAmount);

        vm.prank(owner);
        stakeManager.setStakeAmount(newAmount);

        assertEq(stakeManager.stakeAmount(), newAmount);
    }

    function test_SetStakeAmount_RevertNotOwner() public {
        vm.expectRevert();
        vm.prank(user1);
        stakeManager.setStakeAmount(5_000_000);
    }

    function test_SetStakeAmount_RevertZeroAmount() public {
        vm.expectRevert(StakeManager.InvalidStakeAmount.selector);
        vm.prank(owner);
        stakeManager.setStakeAmount(0);
    }

    function test_SetSigner() public {
        address newSigner = makeAddr("newSigner");

        vm.expectEmit(true, true, false, false);
        emit SignerUpdated(signerAddress, newSigner);

        vm.prank(owner);
        stakeManager.setSigner(newSigner);

        assertEq(stakeManager.signer(), newSigner);
    }

    function test_SetSigner_RevertZeroAddress() public {
        vm.expectRevert(StakeManager.ZeroAddress.selector);
        vm.prank(owner);
        stakeManager.setSigner(address(0));
    }

    function test_SetTreasury() public {
        address newTreasury = makeAddr("newTreasury");

        vm.expectEmit(true, true, false, false);
        emit TreasuryUpdated(treasury, newTreasury);

        vm.prank(owner);
        stakeManager.setTreasury(newTreasury);

        assertEq(stakeManager.treasury(), newTreasury);
    }

    function test_SetTreasury_RevertZeroAddress() public {
        vm.expectRevert(StakeManager.ZeroAddress.selector);
        vm.prank(owner);
        stakeManager.setTreasury(address(0));
    }

    function test_PauseUnpause() public {
        vm.prank(owner);
        stakeManager.pause();

        assertTrue(stakeManager.paused());

        vm.prank(owner);
        stakeManager.unpause();

        assertFalse(stakeManager.paused());
    }

    function test_EmergencyWithdraw() public {
        vm.prank(user1);
        stakeManager.stake();

        vm.prank(user2);
        stakeManager.stake();

        uint256 totalStaked = STAKE_AMOUNT * 2;
        address emergency = makeAddr("emergency");

        vm.prank(owner);
        stakeManager.pause();

        vm.prank(owner);
        stakeManager.emergencyWithdraw(emergency);

        assertEq(usdc.balanceOf(emergency), totalStaked);
        assertEq(usdc.balanceOf(address(stakeManager)), 0);
    }

    function test_EmergencyWithdraw_RevertNotPaused() public {
        vm.expectRevert();
        vm.prank(owner);
        stakeManager.emergencyWithdraw(owner);
    }

    function test_EmergencyWithdraw_RevertZeroAddress() public {
        vm.prank(owner);
        stakeManager.pause();

        vm.expectRevert(StakeManager.ZeroAddress.selector);
        vm.prank(owner);
        stakeManager.emergencyWithdraw(address(0));
    }

    // ============ Fuzz Tests ============

    function testFuzz_Stake(uint256 userSeed) public {
        address user = address(uint160(bound(userSeed, 1, type(uint160).max)));

        usdc.mint(user, STAKE_AMOUNT);

        vm.prank(user);
        usdc.approve(address(stakeManager), STAKE_AMOUNT);

        vm.prank(user);
        stakeManager.stake();

        assertTrue(stakeManager.isStaked(user));
    }

    function testFuzz_Refund(uint256 debt) public {
        debt = bound(debt, 0, STAKE_AMOUNT);

        vm.prank(user1);
        stakeManager.stake();

        uint256 nonce = 0;
        bytes memory signature = _signRefund(user1, debt, nonce);

        uint256 userBalanceBefore = usdc.balanceOf(user1);
        uint256 treasuryBalanceBefore = usdc.balanceOf(treasury);

        vm.prank(user1);
        stakeManager.refund(debt, nonce, signature);

        assertEq(usdc.balanceOf(user1), userBalanceBefore + (STAKE_AMOUNT - debt));
        assertEq(usdc.balanceOf(treasury), treasuryBalanceBefore + debt);
    }

    function testFuzz_SetStakeAmount(uint256 amount) public {
        amount = bound(amount, 1, type(uint256).max);

        vm.prank(owner);
        stakeManager.setStakeAmount(amount);

        assertEq(stakeManager.stakeAmount(), amount);
    }

    // ============ Multi-user Tests ============

    function test_MultipleUsers() public {
        vm.prank(user1);
        stakeManager.stake();

        vm.prank(user2);
        stakeManager.stake();

        assertTrue(stakeManager.isStaked(user1));
        assertTrue(stakeManager.isStaked(user2));
        assertEq(usdc.balanceOf(address(stakeManager)), STAKE_AMOUNT * 2);

        // User1 refunds with debt
        uint256 user1Debt = 500_000;
        bytes memory sig1 = _signRefund(user1, user1Debt, 0);
        vm.prank(user1);
        stakeManager.refund(user1Debt, 0, sig1);

        // User2 refunds with no debt
        bytes memory sig2 = _signRefund(user2, 0, 0);
        vm.prank(user2);
        stakeManager.refund(0, 0, sig2);

        assertFalse(stakeManager.isStaked(user1));
        assertFalse(stakeManager.isStaked(user2));
        assertEq(usdc.balanceOf(treasury), user1Debt);
    }
}
