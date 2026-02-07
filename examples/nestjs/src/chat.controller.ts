import { Body, Controller, Post } from "@nestjs/common";
import { ChatService } from "./chat.service";

@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body("prompt") prompt: string) {
    const response = await this.chatService.chat(prompt);
    return { response };
  }
}
