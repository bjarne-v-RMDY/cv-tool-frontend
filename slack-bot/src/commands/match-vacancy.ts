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

      const vacancyBlocks = vacancies.slice(0, 10).map((vacancy) => ({
        type: 'section' as const,
        text: {
          type: 'mrkdwn' as const,
          text: `*${vacancy.Title}*\n${vacancy.Client ? `_${vacancy.Client}_\n` : ''}${vacancy.Description.substring(0, 100)}...`,
        },
        accessory: {
          type: 'button' as const,
          text: {
            type: 'plain_text' as const,
            text: 'Match Candidates',
          },
          value: vacancy.Id.toString(),
          action_id: `match_vacancy_${vacancy.Id}`,
        },
      }));

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
      text: `🔍 Finding candidates for vacancy #${vacancyId}...`,
    });

    // Get matched candidates
    const { vacancy, candidates } = await cvToolApi.matchVacancy(vacancyId);

    // Format candidates as Slack blocks
    const candidateBlocks = candidates.slice(0, 10).map((candidate, index) => ({
      type: 'section' as const,
      text: {
        type: 'mrkdwn' as const,
        text: `*${index + 1}. ${candidate.name}*${candidate.score ? ` (${candidate.score.toFixed(1)}% match)` : ''}\n` +
          `${candidate.seniority || 'N/A'} • ${candidate.yearsOfExperience || 'N/A'} years\n` +
          `${candidate.location || 'Location N/A'}\n` +
          `${candidate.summary ? candidate.summary.substring(0, 150) + '...' : ''}`,
      },
      accessory: {
        type: 'button' as const,
        text: {
          type: 'plain_text' as const,
          text: 'View Profile',
        },
        url: `${config.cvTool.baseUrl}/dashboard/people/${candidate.userId}`,
      },
    }));

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

