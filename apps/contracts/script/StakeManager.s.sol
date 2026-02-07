// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { StakeManager } from "../src/StakeManager.sol";

/**
 * @title StakeManagerScript
 * @notice Deployment script for StakeManager contract
 * @dev Usage:
 *      - Local: forge script script/StakeManager.s.sol --fork-url http://localhost:8545 --broadcast
 *      - Base Mainnet: forge script script/StakeManager.s.sol --rpc-url base --broadcast --verify
 *
 * Environment variables:
 *      - PRIVATE_KEY: Deployer private key
 *      - USDC_ADDRESS: USDC token address (defaults to Base mainnet USDC)
 *      - OWNER_ADDRESS: Contract owner address (defaults to deployer)
 *      - SIGNER_ADDRESS: Backend signer address (required)
 *      - TREASURY_ADDRESS: Treasury address for debt collection (required)
 *      - STAKE_AMOUNT: Required stake amount in USDC wei (defaults to 3 USDC)
 */
contract StakeManagerScript is Script {
    // Base Mainnet USDC address
    address public constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    // Default stake amount: 3 USDC (6 decimals)
    uint256 public constant DEFAULT_STAKE_AMOUNT = 3_000_000;

    function setUp() public { }

    function run() public {
        // Get configuration from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address usdcAddress = vm.envOr("USDC_ADDRESS", BASE_USDC);
        address ownerAddress = vm.envOr("OWNER_ADDRESS", deployer);
        address signerAddress = vm.envAddress("SIGNER_ADDRESS");
        address treasuryAddress = vm.envAddress("TREASURY_ADDRESS");
        uint256 stakeAmount = vm.envOr("STAKE_AMOUNT", DEFAULT_STAKE_AMOUNT);

        console.log("Deploying StakeManager...");
        console.log("Deployer:", deployer);
        console.log("USDC:", usdcAddress);
        console.log("Owner:", ownerAddress);
        console.log("Signer:", signerAddress);
        console.log("Treasury:", treasuryAddress);
        console.log("Stake Amount:", stakeAmount);

        vm.startBroadcast(deployerPrivateKey);

        StakeManager stakeManager =
            new StakeManager(usdcAddress, ownerAddress, signerAddress, treasuryAddress, stakeAmount);

        console.log("StakeManager deployed at:", address(stakeManager));

        vm.stopBroadcast();
    }
}
