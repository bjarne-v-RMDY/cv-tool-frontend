import { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { cvToolApi } from '../services/cv-tool-api';
import { config } from '../config';

export async function handleMatchVacancy({
  command,
  ack,
  client,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  try {
    const vacancyIdStr = command.text.trim();

    if (!vacancyIdStr) {
      // Show list of vacancies
      const vacancies = await cvToolApi.getVacancies();

      if (vacancies.length === 0) {
        await respond({
          response_type: 'ephemeral',
          text: '📭 No vacancies found. Upload a vacancy first using `/upload-vacancy`.',
        });
        return;
      }

      const vacancyBlocks = vacancies.slice(0, 10).flatMap((vacancy) => [
        {
          type: 'section' as const,
          text: {
            type: 'mrkdwn' as const,
            text: `*${vacancy.Title}*\n${vacancy.Client ? `_${vacancy.Client}_\n` : ''}${vacancy.Description.substring(0, 100)}...`,
          },
        },
        {
          type: 'actions' as const,
          elements: [
            {
              type: 'button' as const,
              text: {
                type: 'plain_text' as const,
                text: 'Match Candidates',
              },
              value: vacancy.Id.toString(),
              action_id: `match_vacancy_${vacancy.Id}`,
              style: 'primary' as const,
            },
            {
              type: 'button' as const,
              text: {
                type: 'plain_text' as const,
                text: 'Delete',
              },
              value: vacancy.Id.toString(),
              action_id: `delete_vacancy_${vacancy.Id}`,
              style: 'danger' as const,
            },
          ],
        },
      ]);

      await respond({
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '💼 *Select a Vacancy to Match*\n\nChoose a vacancy to find matching candidates:',
            },
          },
          {
            type: 'divider',
          },
          ...vacancyBlocks,
        ],
      });

      return;
    }

    const vacancyId = parseInt(vacancyIdStr, 10);
    if (isNaN(vacancyId)) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ Invalid vacancy ID. Please provide a valid number.',
      });
      return;
    }

    // Post initial "matching" message
    await respond({
      response_type: 'in_channel',
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

    // Send the final results
    await respond({
      response_type: 'in_channel',
      replace_original: true,
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
                text: '🔄 Refresh Matches',
              },
              value: vacancyId.toString(),
              action_id: `refresh_vacancy_matches_${vacancyId}`,
            },
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
    console.error('Error handling /match-vacancy:', error);

    await respond({
      response_type: 'ephemeral',
      text: '❌ Sorry, there was an error matching candidates. Please try again.',
    });
  }
}

