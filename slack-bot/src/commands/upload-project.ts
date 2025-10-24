import { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { userMappingService } from '../services/user-mapping';
import { tempUploadService } from '../services/temp-upload';
import { config } from '../config';

export async function handleUploadProject({
  command,
  ack,
  client,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    const slackUserId = command.user_id;

    // Always show user selection for project uploads (don't auto-map)
    const users = await userMappingService.getAllCVToolUsers();

    if (users.length === 0) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ No users found in the CV Tool database. Please add users first via the web interface.',
      });
      return;
    }

    const options = users.slice(0, 100).map((user) => ({
      text: {
        type: 'plain_text' as const,
        text: `${user.Name}${user.Email ? ` (${user.Email})` : ''}`,
      },
      value: user.Id.toString(),
    }));

    await respond({
      response_type: 'ephemeral',
      text: 'Select User for Project Upload',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '📁 *Upload Project Document*\n\nSelect which user this project belongs to:',
          },
        },
        {
          type: 'actions',
          block_id: `user_selection_project_${slackUserId}_${Date.now()}`,
          elements: [
            {
              type: 'static_select',
              action_id: 'select_user_project',
              placeholder: {
                type: 'plain_text',
                text: 'Select user profile',
              },
              options,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Error handling /upload-project:', error);

    await respond({
      response_type: 'ephemeral',
      text: '❌ Sorry, there was an error processing your request. Please try again.',
    });
  }
}

