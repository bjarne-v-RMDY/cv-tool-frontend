import { AllMiddlewareArgs, SlackActionMiddlewareArgs } from '@slack/bolt';
import { userMappingService } from '../services/user-mapping';
import { tempUploadService } from '../services/temp-upload';
import { config } from '../config';

export async function handleUserSelectCV({
  action,
  ack,
  body,
  client,
}: SlackActionMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    if (action.type !== 'static_select') return;

    const selectedUserId = parseInt(action.selected_option.value, 10);
    const slackUserId = body.user.id;

    // Get user email from Slack
    const userInfo = await client.users.info({ user: slackUserId });
    const slackEmail = userInfo.user?.profile?.email || null;

    // Create the mapping
    await userMappingService.manualLink(
      slackUserId,
      slackEmail,
      selectedUserId
    );

    // Generate upload link
    const uploadLink = await tempUploadService.generateUploadLink(
      slackUserId,
      'cv'
    );

    const uploadUrl = `${config.cvTool.baseUrl}/upload?type=cv&token=${uploadLink.id}`;

    // Update the message
    await client.chat.postEphemeral({
      channel: body.channel?.id || '',
      user: slackUserId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '✅ *Profile Linked*\n\n📄 Now you can upload your CV. Click the button below:',
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
    console.error('Error handling user selection for CV:', error);
  }
}

export async function handleUserSelectProject({
  action,
  ack,
  body,
  client,
}: SlackActionMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    if (action.type !== 'static_select') return;

    const selectedUserId = parseInt(action.selected_option.value, 10);
    const blockId = (action as any).block_id as string;
    
    // Extract target Slack user ID from block_id (format: user_selection_project_{slackUserId})
    const targetSlackUserId = blockId.replace('user_selection_project_', '');
    const initiatorSlackUserId = body.user.id;

    // Get user email from Slack
    const userInfo = await client.users.info({ user: targetSlackUserId });
    const slackEmail = userInfo.user?.profile?.email || null;
    const userName = userInfo.user?.real_name || userInfo.user?.name || 'User';

    // Create the mapping
    await userMappingService.manualLink(
      targetSlackUserId,
      slackEmail,
      selectedUserId
    );

    // Generate upload link
    const uploadLink = await tempUploadService.generateUploadLink(
      initiatorSlackUserId,
      'project',
      selectedUserId
    );

    const uploadUrl = `${config.cvTool.baseUrl}/upload?type=project&token=${uploadLink.id}&userId=${selectedUserId}`;

    // Update the message
    await client.chat.postEphemeral({
      channel: body.channel?.id || '',
      user: initiatorSlackUserId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Profile Linked for ${userName}*\n\n📁 Now you can upload project documents. Click the button below:`,
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
    console.error('Error handling user selection for project:', error);
  }
}

export async function handleMatchVacancyButton({
  action,
  ack,
  body,
  client,
}: SlackActionMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    if (action.type !== 'button' || !action.value) return;

    const vacancyId = parseInt(action.value, 10);

    // Trigger the match vacancy command logic
    // This is a simplified version - in production, you'd want to refactor shared logic
    await client.chat.postEphemeral({
      channel: body.channel?.id || '',
      user: body.user.id,
      text: `Processing vacancy match for ID ${vacancyId}...`,
    });
  } catch (error) {
    console.error('Error handling match vacancy button:', error);
  }
}

