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
    const commandText = command.text.trim();

    // Check if user mentioned someone or uploading for themselves
    let targetSlackUserId = slackUserId;
    const userMentionMatch = commandText.match(/<@([A-Z0-9]+)>/);
    if (userMentionMatch) {
      targetSlackUserId = userMentionMatch[1];
    }

    // Get user email from Slack
    const userInfo = await client.users.info({ user: targetSlackUserId });
    const slackEmail = userInfo.user?.profile?.email || null;
    const userName = userInfo.user?.real_name || userInfo.user?.name || 'User';

    // Try to get or create user mapping
    const cvToolUserId = await userMappingService.getOrCreateMapping(
      targetSlackUserId,
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
        text: `Select Profile for ${userName}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `👤 *Select Profile for ${userName}*\n\nI couldn't automatically match this user. Please select their profile from the CV Tool:`,
            },
          },
          {
            type: 'actions',
            block_id: `user_selection_project_${targetSlackUserId}`,
            elements: [
              {
                type: 'static_select',
                action_id: 'select_user_project',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select profile',
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
      'project',
      cvToolUserId
    );

    const uploadUrl = `${config.cvTool.baseUrl}/upload?type=project&token=${uploadLink.id}&userId=${cvToolUserId}`;

    const isSelf = targetSlackUserId === slackUserId;
    const uploadText = isSelf
      ? '📁 *Upload Project Document*\n\nClick the button below to upload project documentation.'
      : `📁 *Upload Project Document for ${userName}*\n\nClick the button below to upload project documentation.`;

    await respond({
      response_type: 'ephemeral',
      text: isSelf ? 'Upload Project' : `Upload Project for ${userName}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: uploadText + ' The link will expire in 15 minutes.',
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📤 Upload Project',
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
    console.error('Error handling /upload-project:', error);

    await respond({
      response_type: 'ephemeral',
      text: '❌ Sorry, there was an error processing your request. Please try again.',
    });
  }
}

