import { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { userMappingService } from '../services/user-mapping';
import { tempUploadService } from '../services/temp-upload';
import { config } from '../config';

export async function handleUploadCV({
  command,
  ack,
  client,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    const slackUserId = command.user_id;

    // Get user email from Slack
    const userInfo = await client.users.info({ user: slackUserId });
    const slackEmail = userInfo.user?.profile?.email || null;

    // Try to get or create user mapping
    const cvToolUserId = await userMappingService.getOrCreateMapping(
      slackUserId,
      slackEmail
    );

    if (!cvToolUserId) {
      // No mapping exists - show user selection dropdown
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
        text: 'Select Your Profile',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '👤 *Select Your Profile*\n\nI couldn\'t automatically match your Slack account. Please select your profile from the CV Tool:',
            },
          },
          {
            type: 'actions',
            block_id: 'user_selection_cv',
            elements: [
              {
                type: 'static_select',
                action_id: 'select_user_cv',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select your profile',
                },
                options,
              },
            ],
          },
        ],
      });

      return;
    }

    // Generate temporary upload link
    const uploadLink = await tempUploadService.generateUploadLink(
      slackUserId,
      'cv'
    );

    const uploadUrl = `${config.cvTool.baseUrl}/upload?type=cv&token=${uploadLink.id}`;

    await respond({
      response_type: 'ephemeral',
      text: 'Upload Your CV',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '📄 *Upload Your CV*\n\nClick the button below to upload your CV. The link will expire in 15 minutes.',
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📤 Upload CV',
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
    console.error('Error handling /upload-cv:', error);

    await respond({
      response_type: 'ephemeral',
      text: '❌ Sorry, there was an error processing your request. Please try again.',
    });
  }
}

