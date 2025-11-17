import { AllMiddlewareArgs, SlackActionMiddlewareArgs } from '@slack/bolt';
import axios from 'axios';
import { config } from '../config';
import { cvToolApi } from '../services/cv-tool-api';

export async function handleDeleteVacancy({
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

    if (isNaN(vacancyId)) {
      await respond({
        replace_original: false,
        text: '❌ Invalid vacancy ID.',
      });
      return;
    }

    // Show confirmation
    await respond({
      replace_original: false,
      text: `🗑️ Deleting vacancy #${vacancyId}...`,
    });

    // Call delete API
    const deleteResponse = await axios.delete(
      `${config.cvTool.baseUrl}/api/vacancies/${vacancyId}`
    );

    if (deleteResponse.status !== 200) {
      throw new Error('Failed to delete vacancy');
    }

    const { message, deletedFiles } = deleteResponse.data;

    // Show success message
    await respond({
      replace_original: false,
      text: `✅ ${message}${deletedFiles > 0 ? `\n📁 Deleted ${deletedFiles} file${deletedFiles !== 1 ? 's' : ''} from storage.` : ''}`,
    });

    // Refresh the vacancy list
    try {
      const vacancies = await cvToolApi.getVacancies();

      if (vacancies.length === 0) {
        await respond({
          replace_original: true,
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
        replace_original: true,
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
    } catch (refreshError) {
      console.error('Error refreshing vacancy list:', refreshError);
      // Don't fail if refresh fails - user already got success message
    }
  } catch (error) {
    console.error('Error deleting vacancy:', error);

    const errorMessage =
      axios.isAxiosError(error) && error.response?.data?.error
        ? error.response.data.error
        : 'Sorry, there was an error deleting the vacancy. Please try again.';

    await respond({
      replace_original: false,
      text: `❌ ${errorMessage}`,
    });
  }
}

