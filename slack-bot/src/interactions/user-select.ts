import { AllMiddlewareArgs, SlackActionMiddlewareArgs } from '@slack/bolt';
import { userMappingService } from '../services/user-mapping';
import { tempUploadService } from '../services/temp-upload';
import { config } from '../config';

export async function handleUserSelectCV({
  action,
  ack,
  body,
  client,
  respond,
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

    // Update the message using respond
    await respond({
      replace_original: true,
      text: 'Profile Linked - Upload Your CV',
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
  respond,
}: SlackActionMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    if (action.type !== 'static_select') return;

    const selectedUserId = parseInt(action.selected_option.value, 10);
    const slackUserId = body.user.id;
    const selectedUserName = action.selected_option.text.text;

    // Generate upload link for the selected CV Tool user
    // No Slack user mapping needed - just upload for the selected CV Tool user
    const uploadLink = await tempUploadService.generateUploadLink(
      slackUserId,
      'project',
      selectedUserId
    );

    const uploadUrl = `${config.cvTool.baseUrl}/upload?type=project&token=${uploadLink.id}&userId=${selectedUserId}`;

    // Update the message using respond
    await respond({
      replace_original: true,
      text: `User Selected: ${selectedUserName} - Upload Project`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *User Selected: ${selectedUserName}*\n\n📁 Click the button below to upload project documents:`,
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
  respond,
}: SlackActionMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  // Acknowledge immediately
  await ack();

  try {
    if (action.type !== 'button' || !action.value) return;

    const vacancyId = parseInt(action.value, 10);

    // Import cvToolApi here to avoid circular dependencies
    const { cvToolApi } = await import('../services/cv-tool-api');
    
    // Show initial loading message
    await respond({
      replace_original: false,
      text: `🔍 Finding and evaluating candidates for vacancy #${vacancyId}...\n_This may take up to a minute as we analyze each candidate with AI._`,
    });

    // Get matched candidates
    const { vacancy, candidates } = await cvToolApi.matchVacancy(vacancyId);

    // Format candidates as Slack blocks with enhanced match info
    const candidateBlocks = candidates.slice(0, 10).map((candidate, index) => {
      const matchScore = (candidate as any).overallScore ?? (candidate.score ? Math.round(candidate.score * 100) : 0)
      const scoreEmoji = matchScore >= 80 ? '🟢' : matchScore >= 60 ? '🟡' : '🔴'
      
      const matchedReqs = (candidate as any).matchedRequirements || []
      const missingReqs = (candidate as any).missingRequirements || []
      const reasoning = (candidate as any).reasoning || ''
      
      let matchDetails = ''
      if (matchedReqs.length > 0) {
        matchDetails += `✅ *Matched:* ${matchedReqs.slice(0, 3).join(', ')}${matchedReqs.length > 3 ? ` (+${matchedReqs.length - 3} more)` : ''}\n`
      }
      if (missingReqs.length > 0) {
        matchDetails += `❌ *Missing:* ${missingReqs.slice(0, 3).join(', ')}${missingReqs.length > 3 ? ` (+${missingReqs.length - 3} more)` : ''}\n`
      }
      if (reasoning) {
        matchDetails += `💡 _${reasoning.substring(0, 120)}${reasoning.length > 120 ? '...' : ''}_\n`
      }
      
      return {
        type: 'section' as const,
        text: {
          type: 'mrkdwn' as const,
          text: `*${index + 1}. ${candidate.name}* ${scoreEmoji} *${matchScore}% match*\n` +
            `${candidate.seniority || 'N/A'} • ${candidate.yearsOfExperience || 'N/A'} years • ${candidate.location || 'Location N/A'}\n` +
            (matchDetails || `${candidate.summary ? candidate.summary.substring(0, 100) + '...' : ''}`),
        },
        accessory: {
          type: 'button' as const,
          text: {
            type: 'plain_text' as const,
            text: 'View Profile',
          },
          url: `${config.cvTool.baseUrl}/dashboard/people/${candidate.userId}`,
        },
      }
    });

    // Send the results
    await respond({
      replace_original: false,
      text: `Matched candidates for: ${vacancy.Title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `💼 *${vacancy.Title}*\n${vacancy.Client ? `_${vacancy.Client}_\n` : ''}${vacancy.Location || ''} ${vacancy.RemoteWork ? '🌐 Remote' : ''}`,
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Found ${candidates.length} Matching Candidates*`,
          },
        },
        ...candidateBlocks,
        {
          type: 'divider',
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🌐 View Full Details',
              },
              url: `${config.cvTool.baseUrl}/dashboard/vacancies/${vacancyId}`,
              style: 'primary',
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Error handling match vacancy button:', error);
    
    // Send error message
    await respond({
      replace_original: false,
      text: '❌ Sorry, there was an error matching candidates. Please try again.',
    });
  }
}

