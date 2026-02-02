"use client";

import {
  ArrowRightLeft,
  CheckCircle,
  Key,
  Loader2,
  Plus,
  Shield,
  Trash2,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { type Address, isAddress } from "viem";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSessionKeys } from "@/hooks/use-session-keys";
import { useSmartAccount } from "@/hooks/use-smart-account";

export default function Home() {
  const { address, isConnected } = useAccount();
  const {
    address: smartAccountAddress,
    isDeployed,
    isLoading,
    isDeploying,
    error,
    refreshDeploymentStatus,
    deploySmartAccount,
  } = useSmartAccount();

  const {
    sessionKeys,
    isConfigured,
    isLoading: isSessionKeysLoading,
    isApproving,
    isSendingTestTransfer,
    lastTestTransferHash,
    error: sessionKeyError,
    createSessionKey,
    approveSessionKey,
    removeSessionKey,
    sendTestTransfer,
    formatRemainingTime,
  } = useSessionKeys(smartAccountAddress);

  const [testTransferAddress, setTestTransferAddress] = useState("");
  const [transferSessionKey, setTransferSessionKey] = useState<
    Address | undefined
  >(undefined);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex flex-col items-center justify-center space-y-8">
        <div className="text-center space-y-4 max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Welcome to Router402
          </h1>
          <p className="text-xl text-muted-foreground">
            Decentralized payment routing powered by Base and Smart Accounts
          </p>
        </div>

        {isConnected ? (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
              <CardDescription>
                Your wallet and Smart Account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* EOA Wallet Address */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Wallet Address
                  </p>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Connected</span>
                  </div>
                </div>
                <code className="block p-2 bg-muted rounded text-xs break-all">
                  {address}
                </code>
              </div>

              {/* Smart Account Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Smart Account</p>
                  {isLoading ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : smartAccountAddress ? (
                    <div className="flex items-center gap-1 text-xs">
                      {isDeployed ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-green-600">Deployed</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-yellow-600" />
                          <span className="text-yellow-600">Not Deployed</span>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>

                {isLoading ? (
                  <div className="p-2 bg-muted rounded flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : error ? (
                  <div className="p-2 bg-destructive/10 rounded text-xs text-destructive">
                    {error.message}
                  </div>
                ) : smartAccountAddress ? (
                  <code className="block p-2 bg-muted rounded text-xs break-all">
                    {smartAccountAddress}
                  </code>
                ) : (
                  <div className="p-2 bg-muted rounded text-xs text-muted-foreground text-center">
                    Calculating Smart Account address...
                  </div>
                )}
              </div>

              {/* Refresh Button */}
              {smartAccountAddress && !isLoading && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={refreshDeploymentStatus}
                >
                  Refresh Status
                </Button>
              )}

              {/* Deploy Button */}
              {smartAccountAddress && !isDeployed && !isLoading && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={deploySmartAccount}
                  disabled={isDeploying}
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deploying...
                    </>
                  ) : (
                    "Deploy Smart Account"
                  )}
                </Button>
              )}

              {/* Configuration Status */}
              {smartAccountAddress &&
                isDeployed &&
                !isLoading &&
                !isConfigured && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="p-3 bg-muted rounded text-xs text-muted-foreground">
                      Pimlico is not configured. Set{" "}
                      <code>NEXT_PUBLIC_PIMLICO_API_KEY</code> in your
                      environment to enable session keys.
                    </div>
                  </div>
                )}

              {/* Session Keys Section */}
              {smartAccountAddress &&
                isDeployed &&
                isConfigured &&
                !isLoading && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Session Keys</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={createSessionKey}
                        disabled={isSessionKeysLoading}
                      >
                        {isSessionKeysLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>

                    {sessionKeyError && (
                      <div className="p-2 bg-destructive/10 rounded text-xs text-destructive">
                        <p className="font-medium">Error:</p>
                        <p className="break-all">{sessionKeyError.message}</p>
                      </div>
                    )}

                    {sessionKeys.length === 0 ? (
                      <div className="p-3 bg-muted rounded text-xs text-muted-foreground text-center">
                        No session keys. Click &quot;Add&quot; to create one.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sessionKeys.map((key) => (
                          <div
                            key={key.publicKey}
                            className="p-3 bg-muted rounded space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <code className="text-xs break-all flex-1 mr-2">
                                {key.publicKey}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSessionKey(key.publicKey)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Expires in: {formatRemainingTime(key)}
                              </span>
                              {key.isApproved ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Approved
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setTransferSessionKey(key.publicKey)
                                    }
                                    className="h-6 text-xs"
                                  >
                                    <ArrowRightLeft className="h-3 w-3 mr-1" />
                                    Test Transfer
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    approveSessionKey(key.publicKey)
                                  }
                                  disabled={isApproving}
                                  className="h-6 text-xs"
                                >
                                  {isApproving ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      Approving...
                                    </>
                                  ) : (
                                    "Approve"
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Test Transfer Form */}
                    {transferSessionKey && (
                      <div className="mt-4 p-3 bg-muted/50 rounded border space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            Send Test ETH Transfer
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTransferSessionKey(undefined);
                              setTestTransferAddress("");
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Send 0.0001 ETH using session key to test
                          authorization
                        </p>
                        <Input
                          placeholder="Recipient address (0x...)"
                          value={testTransferAddress}
                          onChange={(e) =>
                            setTestTransferAddress(e.target.value)
                          }
                          className="text-xs"
                        />
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full"
                          disabled={
                            isSendingTestTransfer ||
                            !isAddress(testTransferAddress)
                          }
                          onClick={async () => {
                            if (
                              transferSessionKey &&
                              isAddress(testTransferAddress)
                            ) {
                              await sendTestTransfer(
                                transferSessionKey,
                                testTransferAddress as Address
                              );
                            }
                          }}
                        >
                          {isSendingTestTransfer ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <ArrowRightLeft className="h-4 w-4 mr-2" />
                              Send 0.0001 ETH
                            </>
                          )}
                        </Button>
                        {sessionKeyError && (
                          <div className="p-2 bg-destructive/10 rounded text-xs text-destructive">
                            <p className="font-medium">Error:</p>
                            <p className="break-all">
                              {sessionKeyError.message}
                            </p>
                          </div>
                        )}
                        {lastTestTransferHash && (
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded text-xs text-green-700 dark:text-green-300">
                            <p className="font-medium">Transfer successful!</p>
                            <a
                              href={`https://sepolia.basescan.org/tx/${lastTestTransferHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline break-all"
                            >
                              View on BaseScan
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Connect your wallet to start using Router 402
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Click the &quot;Connect Wallet&quot; button in the navigation
                bar to get started.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-12">
          <Card>
            <CardHeader>
              <Wallet className="h-8 w-8 mb-2" />
              <CardTitle>Easy Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Seamlessly connect your wallet and start making transactions on
                Base
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 mb-2" />
              <CardTitle>Fast & Efficient</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Built on Base for lightning-fast transactions with minimal fees
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 mb-2" />
              <CardTitle>Secure & Reliable</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Powered by Kernel Smart Accounts for enhanced security
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
