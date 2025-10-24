import { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import axios from 'axios';
import { config } from '../config';
import { conversationService } from '../services/conversation';

export async function handleChat({
  command,
  ack,
  client,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    const query = command.text.trim();
    const userId = command.user_id;
    const channelId = command.channel_id;

    if (!query) {
      await respond({
        response_type: 'ephemeral',
        text: '❓ Please provide a search query. Example: `/chat find senior React developers`',
      });
      return;
    }

    // Get existing conversation history
    const conversationHistory = conversationService.getConversation(userId, channelId);
    const messageCount = conversationHistory.length;

    // Add current user message to history
    conversationService.addUserMessage(userId, channelId, query);

    // Post initial "searching" message using respond
    const contextInfo = messageCount > 0 ? ` (continuing conversation with ${messageCount} previous message${messageCount !== 1 ? 's' : ''})` : '';
    await respond({
      response_type: 'in_channel',
      text: `🔍 Searching for: "${query}"...${contextInfo}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔍 *Searching candidates...*\n\n_Query: ${query}_${contextInfo ? `\n💬 _Conversation context active_` : ''}`,
          },
        },
      ],
    });

    // Build messages array with conversation history
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: query,
      },
    ];

    // Call the chat API with full conversation
    const response = await axios.post(
      `${config.cvTool.baseUrl}/api/chat`,
      {
        messages,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    // For now, we'll handle non-streaming response
    // In production, you'd want to stream and update the message progressively
    let responseText = '';
    
    if (typeof response.data === 'string') {
      responseText = response.data;
    } else if (response.data.text) {
      responseText = response.data.text;
    } else {
      responseText = JSON.stringify(response.data);
    }

    // Truncate if too long for Slack (3000 char limit for text blocks)
    if (responseText.length > 2800) {
      responseText = responseText.substring(0, 2800) + '...\n\n_[Response truncated]_';
    }

    // Add assistant response to conversation history
    conversationService.addAssistantMessage(userId, channelId, responseText);

    // Get updated message count
    const updatedMessageCount = conversationService.getMessageCount(userId, channelId);
    const conversationInfo = `💬 Conversation (${updatedMessageCount} message${updatedMessageCount !== 1 ? 's' : ''})`;

    // Send the final results with context indicator
    await respond({
      response_type: 'in_channel',
      replace_original: true,
      text: `Results for: "${query}"`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔍 *Search Results*\n\n_Query: ${query}_`,
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: responseText,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `${conversationInfo} • Use \`/chat\` to continue or \`/chat-clear\` to start fresh`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🗑️ Clear Context',
              },
              value: `${userId}-${channelId}`,
              action_id: 'clear_chat_context',
              style: 'danger',
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Error handling /chat:', error);

    await respond({
      response_type: 'ephemeral',
      text: '❌ Sorry, there was an error searching candidates. Please try again.',
    });
  }
}

