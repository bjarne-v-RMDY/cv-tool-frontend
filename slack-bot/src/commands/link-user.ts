import { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { userMappingService } from '../services/user-mapping';

export async function handleLinkUser({
  command,
  ack,
  client,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    const commandText = command.text.trim();
    const parts = commandText.split(/\s+/);

    if (parts.length < 2) {
      await respond({
        response_type: 'ephemeral',
        text: '❓ Usage: `/link-user @slack-user <cv-tool-user-id>`\n\nExample: `/link-user @john.doe 123`',
      });
      return;
    }

    // Extract Slack user mention
    const userMentionMatch = parts[0].match(/<@([A-Z0-9]+)>/);
    if (!userMentionMatch) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ Please mention a Slack user. Example: `/link-user @john.doe 123`',
      });
      return;
    }

    const targetSlackUserId = userMentionMatch[1];
    const cvToolUserId = parseInt(parts[1], 10);

    if (isNaN(cvToolUserId)) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ Invalid CV Tool user ID. Please provide a valid number.',
      });
      return;
    }

    // Get target user info from Slack
    const userInfo = await client.users.info({ user: targetSlackUserId });
    const slackEmail = userInfo.user?.profile?.email || null;
    const userName = userInfo.user?.real_name || userInfo.user?.name || 'User';

    // Verify CV Tool user exists and get their name
    const cvToolUser = await userMappingService.getCVToolUser(cvToolUserId);
    if (!cvToolUser) {
      await respond({
        response_type: 'ephemeral',
        text: `❌ CV Tool user with ID ${cvToolUserId} not found.`,
      });
      return;
    }

    // Create the link
    await userMappingService.manualLink(
      targetSlackUserId,
      slackEmail,
      cvToolUserId
    );

    await respond({
      response_type: 'ephemeral',
      text: `✅ Successfully linked Slack user *${userName}* to CV Tool user *${cvToolUser.Name}* (ID: ${cvToolUserId})`,
    });
  } catch (error) {
    console.error('Error handling /link-user:', error);

    await respond({
      response_type: 'ephemeral',
      text: '❌ Sorry, there was an error linking the users. Please check the CV Tool user ID and try again.',
    });
  }
}

