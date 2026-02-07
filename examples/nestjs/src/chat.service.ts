import { Injectable, OnModuleInit } from "@nestjs/common";
import { Router402Sdk } from "@router402/sdk";

@Injectable()
export class ChatService implements OnModuleInit {
  private sdk!: Router402Sdk;

  onModuleInit() {
    const token = process.env.ROUTER402_TOKEN;
    if (!token) {
      throw new Error("ROUTER402_TOKEN environment variable is required");
    }
    this.sdk = new Router402Sdk({ token });
  }

  async chat(prompt: string): Promise<string> {
    return this.sdk.chat(prompt);
  }
}
