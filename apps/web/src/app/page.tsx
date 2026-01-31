"use client";

import { Shield, Wallet, Zap } from "lucide-react";
import { useConnection } from "wagmi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSmartAccount } from "@/hooks/use-smart-account";

export default function Home() {
  const { address, isConnected } = useConnection();
  const smartAccount = useSmartAccount();

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex flex-col items-center justify-center space-y-8">
        <div className="text-center space-y-4 max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Welcome to Router402
          </h1>
          <p className="text-xl text-muted-foreground">
            Decentralized payment routing powered by Base and Biconomy Smart
            Accounts
          </p>
        </div>

        {isConnected ? (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Connected Wallet</CardTitle>
              <CardDescription>
                Your account is connected to the network
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Wallet Address</p>
                <code className="block p-2 bg-muted rounded text-xs break-all">
                  {address}
                </code>
              </div>
              {smartAccount.address && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Smart Account</p>
                  <code className="block p-2 bg-muted rounded text-xs break-all">
                    {smartAccount.address}
                  </code>
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
                Click the "Connect Wallet" button in the navigation bar to get
                started.
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
                Powered by Biconomy Smart Accounts for enhanced security
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
