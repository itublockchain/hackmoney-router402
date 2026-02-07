# Smart Accounts

Route402 uses ZeroDev Kernel v3.1 smart accounts -- ERC-4337 compliant smart contract wallets that support batched transactions, gas sponsorship, and modular plugins.

## How Smart Accounts Work

Each EOA (Externally Owned Account) deterministically maps to a unique smart account address. The mapping is computed using the `CREATE2` opcode with the EOA as a salt, meaning the same EOA always produces the same smart account address regardless of when or whether it's been deployed.

```
EOA Address  ──▶  Kernel Account (CREATE2)  ──▶  Smart Account Address
0x1234...         Factory + Salt                  0xabcd...
```

The smart account only exists on-chain after its first transaction. Before deployment, you can still compute and share its address.

## Methods

### getSmartAccountAddress

Get the deterministic smart account address for a wallet. This works even if the account has not been deployed yet.

```typescript
async getSmartAccountAddress(walletClient: WalletClient): Promise<Address>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `walletClient` | `WalletClient` | Viem wallet client for the owner EOA |

**Returns:** The smart account `Address`.

**Example:**

```typescript
const address = await sdk.getSmartAccountAddress(walletClient);
// "0x1234567890abcdef1234567890abcdef12345678"
```

---

### isSmartAccountDeployed

Check whether a smart account has been deployed on-chain by verifying if code exists at the address.

```typescript
async isSmartAccountDeployed(address: Address): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | `Address` | Smart account address to check |

**Returns:** `true` if the account is deployed, `false` otherwise.

**Example:**

```typescript
const deployed = await sdk.isSmartAccountDeployed("0xabcd...");
if (!deployed) {
  console.log("Account needs to be deployed first");
}
```

---

### getSmartAccountInfo

Get complete information about a smart account, including its address, owner, deployment status, and chain.

```typescript
async getSmartAccountInfo(
  walletClient: WalletClient,
  eoaAddress: Address
): Promise<SmartAccountInfo>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `walletClient` | `WalletClient` | Viem wallet client for the owner |
| `eoaAddress` | `Address` | Owner's EOA address |

**Returns:** A `SmartAccountInfo` object.

```typescript
interface SmartAccountInfo {
  address: Address;     // Smart account address
  eoaAddress: Address;  // Owner EOA address
  isDeployed: boolean;  // On-chain deployment status
  chainId: number;      // Chain ID
}
```

**Example:**

```typescript
const info = await sdk.getSmartAccountInfo(walletClient, eoaAddress);
console.log(`Account: ${info.address}`);
console.log(`Deployed: ${info.isDeployed}`);
console.log(`Chain: ${info.chainId}`);
```

---

### getSmartAccountBalance

Get the native token (ETH) balance of a smart account.

```typescript
async getSmartAccountBalance(address: Address): Promise<bigint>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | `Address` | Smart account address |

**Returns:** Balance in wei as a `bigint`.

**Example:**

```typescript
const balance = await sdk.getSmartAccountBalance(smartAccountAddress);
console.log(`Balance: ${balance} wei`);
```

---

### deploySmartAccount

Deploy a smart account on-chain. This sends a zero-value transaction to the smart account's own address, which triggers the ERC-4337 account deployment through the entry point.

Gas fees are sponsored by the Pimlico paymaster, so the user does not need to hold ETH.

```typescript
async deploySmartAccount(
  walletClient: WalletClient
): Promise<TransactionExecutionResult>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `walletClient` | `WalletClient` | Viem wallet client for the owner |

**Returns:** A `TransactionExecutionResult`.

```typescript
interface TransactionExecutionResult {
  success: boolean;
  txHash?: Hex;
  userOpHash?: Hex;
  error?: string;
}
```

**Example:**

```typescript
const result = await sdk.deploySmartAccount(walletClient);
if (result.success) {
  console.log("Deployed! Tx:", result.txHash);
} else {
  console.error("Deployment failed:", result.error);
}
```

## Understanding Deployment

### When is deployment necessary?

A smart account must be deployed before session keys can be used for transactions. The `setupAccount()` method handles this automatically, but if you're managing the flow manually, check deployment status first:

```typescript
const info = await sdk.getSmartAccountInfo(walletClient, eoaAddress);

if (!info.isDeployed) {
  await sdk.deploySmartAccount(walletClient);
}
```

### What happens during deployment?

1. The SDK creates a Kernel smart account object from the owner's wallet
2. A no-op user operation (0 ETH transfer to self) is created
3. The user operation is submitted to the Pimlico bundler
4. The bundler creates a transaction that includes the account deployment bytecode
5. The Pimlico paymaster sponsors the gas fee
6. The transaction is included in a block, deploying the smart contract

### Cost

Deployment is gasless for the user. The Pimlico paymaster covers gas costs as part of the user operation bundling process.
