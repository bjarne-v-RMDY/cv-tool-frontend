import { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { conversationService } from '../services/conversation';

export async function handleChatClear({
  command,
  ack,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    const userId = command.user_id;
    const channelId = command.channel_id;

    // Get message count before clearing
    const messageCount = conversationService.getMessageCount(userId, channelId);

    // Clear the conversation
    const wasCleared = conversationService.clearConversation(userId, channelId);

    if (wasCleared && messageCount > 0) {
      await respond({
        response_type: 'ephemeral',
        text: `✅ Conversation cleared! Removed ${messageCount} message${messageCount !== 1 ? 's' : ''} from history.\n\nYour next \`/chat\` command will start a fresh conversation.`,
      });
    } else {
      await respond({
        response_type: 'ephemeral',
        text: '💭 No conversation history found. Your next `/chat` command will start fresh!',
      });
    }
  } catch (error) {
    console.error('Error handling /chat-clear:', error);

    await respond({
      response_type: 'ephemeral',
      text: '❌ Sorry, there was an error clearing the conversation. Please try again.',
    });
  }
}

