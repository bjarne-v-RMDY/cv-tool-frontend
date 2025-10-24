import { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import axios from 'axios';
import { config } from '../config';

export async function handleChat({
  command,
  ack,
  client,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    const query = command.text.trim();

    if (!query) {
      await respond({
        response_type: 'ephemeral',
        text: '❓ Please provide a search query. Example: `/chat find senior React developers`',
      });
      return;
    }

    // Post initial "searching" message using respond
    await respond({
      response_type: 'in_channel',
      text: `🔍 Searching for: "${query}"...`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔍 *Searching candidates...*\n\n_Query: ${query}_`,
          },
        },
      ],
    });

    // Call the chat API
    const response = await axios.post(
      `${config.cvTool.baseUrl}/api/chat`,
      {
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
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

    // Send the final results
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

