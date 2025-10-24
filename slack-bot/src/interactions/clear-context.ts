import { SlackActionMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { conversationService } from '../services/conversation';

export async function handleClearChatContext({
  action,
  ack,
  respond,
}: SlackActionMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    if (action.type !== 'button' || !action.value) return;

    // Parse userId and channelId from value
    const [userId, channelId] = action.value.split('-');

    if (!userId || !channelId) {
      await respond({
        replace_original: false,
        text: '❌ Invalid context identifier.',
      });
      return;
    }

    // Get message count before clearing
    const messageCount = conversationService.getMessageCount(userId, channelId);

    // Clear the conversation
    conversationService.clearConversation(userId, channelId);

    await respond({
      replace_original: false,
      text: `✅ Conversation context cleared! Removed ${messageCount} message${messageCount !== 1 ? 's' : ''} from history.\n\nYour next \`/chat\` command will start fresh.`,
    });
  } catch (error) {
    console.error('Error handling clear context button:', error);

    await respond({
      replace_original: false,
      text: '❌ Sorry, there was an error clearing the context. Please try again.',
    });
  }
}

