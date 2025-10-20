import { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { tempUploadService } from '../services/temp-upload';
import { config } from '../config';

export async function handleUploadVacancy({
  command,
  ack,
  client,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    const slackUserId = command.user_id;

    // Generate temporary upload link
    const uploadLink = await tempUploadService.generateUploadLink(
      slackUserId,
      'vacancy'
    );

    const uploadUrl = `${config.cvTool.baseUrl}/upload?type=vacancy&token=${uploadLink.id}`;

    await respond({
      response_type: 'ephemeral',
      text: 'Upload Vacancy',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '💼 *Upload Vacancy Document*\n\nClick the button below to upload a job vacancy. The link will expire in 15 minutes.',
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📤 Upload Vacancy',
              },
              url: uploadUrl,
              style: 'primary',
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `⏰ Expires: <!date^${Math.floor(uploadLink.expiresAt.getTime() / 1000)}^{time}|${uploadLink.expiresAt.toISOString()}>`,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Error handling /upload-vacancy:', error);

    await respond({
      response_type: 'ephemeral',
      text: '❌ Sorry, there was an error processing your request. Please try again.',
    });
  }
}

