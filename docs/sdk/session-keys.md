# Session Keys

Session keys are delegated signing keys that can execute transactions on behalf of a smart account without requiring the owner's wallet to sign every operation. They are central to Route402's payment flow, allowing your backend to process payments automatically.

## How Session Keys Work

```
┌──────────┐     ┌───────────────┐     ┌──────────────┐
│  Owner   │     │  Session Key  │     │  Smart       │
│  Wallet  │     │  (Delegated)  │     │  Account     │
│          │     │               │     │              │
│  Signs   │────▶│  Can execute  │────▶│  Processes   │
│  approval│     │  transactions │     │  user ops    │
│  once    │     │  repeatedly   │     │              │
└──────────┘     └───────────────┘     └──────────────┘
```

1. **Generate** -- Create a random keypair for the session key.
2. **Approve** -- The owner signs an EIP-712 approval that grants the session key permission to act on the smart account.
3. **Enable** -- A first transaction using the session key activates the permission module on-chain.
4. **Use** -- The session key can now sign and submit user operations.

### On-Chain Policies

Session keys are constrained by policies enforced at the smart contract level:

| Policy | Description |
|--------|-------------|
| **Sudo Policy** | Allows the session key to perform any action |
| **Timestamp Policy** | Enforces an expiration time (uint48 on-chain) |
| **Signature Caller Policy** | Restricts which addresses can submit transactions with this key |

## Methods

### generateSessionKey

Generate a new session key pair. This is a synchronous operation that creates a random private key and derives its public address.

```typescript
generateSessionKey(
  smartAccountAddress: Address,
  ownerAddress: Address
): SessionKeyData
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `smartAccountAddress` | `Address` | The smart account this key will operate on |
| `ownerAddress` | `Address` | The owner's EOA address |

**Returns:** A `SessionKeyData` object with `isApproved: false`.

```typescript
const sessionKey = sdk.generateSessionKey(smartAccountAddress, eoaAddress);
// sessionKey.privateKey -- Hex string (keep secret!)
// sessionKey.publicKey  -- Derived address
// sessionKey.expiresAt  -- Timestamp (ms) based on configured validity period
// sessionKey.isApproved -- false (not yet approved)
```

---

### approveSessionKey

Approve a session key by having the owner sign an EIP-712 permission approval. This creates a serialized permission account that encodes the session key's policies.

**This triggers a wallet signature request.** The user will see a signing prompt in their wallet.

```typescript
async approveSessionKey(
  walletClient: WalletClient,
  sessionKey: SessionKeyData,
  allowedCallers?: Address[]
): Promise<SessionKeyData>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `walletClient` | `WalletClient` | Yes | Owner's wallet client |
| `sessionKey` | `SessionKeyData` | Yes | Session key to approve |
| `allowedCallers` | `Address[]` | No | Addresses allowed to use this key (on-chain enforced) |

**Returns:** Updated `SessionKeyData` with `isApproved: true` and `serializedSessionKey` set.

**Example:**

```typescript
// Basic approval
const approvedKey = await sdk.approveSessionKey(walletClient, sessionKey);

// With allowed callers restriction
const approvedKey = await sdk.approveSessionKey(walletClient, sessionKey, [
  "0xbackend-address...",
]);
```

The `allowedCallers` parameter enforces that only the specified addresses can submit user operations using this session key. This is useful for restricting session key usage to your backend server.

---

### isSessionKeyValid

Check if a session key is valid for use. A session key is valid when it exists, is approved, has a serialized key, and has not expired.

```typescript
isSessionKeyValid(sessionKey: SessionKeyData | undefined): boolean
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionKey` | `SessionKeyData \| undefined` | Session key to check |

**Returns:** `true` if the key is valid and ready to use.

---

### canUseSessionKey

Check if a session key can be used for transactions. This is functionally equivalent to `isSessionKeyValid` but only accepts defined session keys.

```typescript
canUseSessionKey(sessionKey: SessionKeyData): boolean
```

---

### isSessionKeyExpired

Check if a session key has passed its expiration time.

```typescript
isSessionKeyExpired(sessionKey: SessionKeyData): boolean
```

**Returns:** `true` if `Date.now() >= sessionKey.expiresAt`.

---

### getSessionKeyRemainingTime

Get the remaining validity time for a session key.

```typescript
getSessionKeyRemainingTime(sessionKey: SessionKeyData): number
```

**Returns:** Remaining time in milliseconds. Returns `0` if expired.

**Example:**

```typescript
const remaining = sdk.getSessionKeyRemainingTime(sessionKey);
const hours = Math.floor(remaining / (1000 * 60 * 60));
console.log(`Session key valid for ${hours} more hours`);
```

---

### exportSessionKeyForBackend

Export session key data in a format suitable for backend use. The exported data contains everything needed to reconstruct a session key client on the server.

```typescript
exportSessionKeyForBackend(
  sessionKey: SessionKeyData
): SessionKeyForBackend | null
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionKey` | `SessionKeyData` | An approved session key |

**Returns:** A `SessionKeyForBackend` object, or `null` if the key is not approved.

```typescript
interface SessionKeyForBackend {
  privateKey: Hex;
  serializedSessionKey: string;
  smartAccountAddress: Address;
  chainId: number;
}
```

**Example:**

```typescript
const backendData = sdk.exportSessionKeyForBackend(approvedKey);
if (backendData) {
  // Send to your backend via the authorize endpoint
  await fetch("/v1/authorize", {
    method: "POST",
    body: JSON.stringify(backendData),
  });
}
```

---

### enableSessionKeyOnChain

Enable a session key on-chain by sending its first transaction. This activates the permission validator module on the smart account.

The method sends a dummy ERC-20 `approve(smartAccountAddress, 0)` call to the USDC contract. The actual approval has no effect -- what matters is that the session key's first user operation triggers the on-chain `enableSignature` mechanism.

```typescript
async enableSessionKeyOnChain(
  sessionKey: SessionKeyData,
  usdcAddress: Address,
  smartAccountAddress: Address
): Promise<TransactionExecutionResult>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionKey` | `SessionKeyData` | An approved session key |
| `usdcAddress` | `Address` | USDC contract address on the target chain |
| `smartAccountAddress` | `Address` | The smart account address |

**Returns:** A `TransactionExecutionResult`.

**Throws:** `SmartAccountError` with type `SESSION_KEY_NOT_APPROVED` if the key is not approved.

## Session Key Lifecycle

```
generate() ──▶ approve() ──▶ enableOnChain() ──▶ use for transactions
                  │                                      │
                  │ owner signs                          │ until expiration
                  │ (wallet prompt)                      │
                  ▼                                      ▼
            isApproved: true                    isSessionKeyExpired()
            serializedSessionKey set             returns true
```

### Storage Considerations

Session key data (including the private key) must be stored securely:

- **Browser**: Use `localStorage` or `sessionStorage` for client-side storage. The key is scoped to the user's browser.
- **Backend**: Store the `SessionKeyForBackend` data in your database or secure environment variables. Protect it as you would any signing key.
- **Expiration**: Check `isSessionKeyValid()` before use. Generate a new key when the current one expires.

### Security Model

- The session key **private key** never touches the owner's wallet -- it's generated independently.
- On-chain policies (timestamp, allowed callers) are enforced by the smart contract, not by the SDK.
- The `allowedCallers` policy restricts which Ethereum addresses can submit user operations. Use this to limit session key usage to your backend's address.
- Session keys can be revoked by the smart account owner at any time (not currently exposed in the SDK API).
