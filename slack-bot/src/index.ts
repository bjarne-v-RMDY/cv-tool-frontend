import { App, ExpressReceiver } from '@slack/bolt';
import { config, validateConfig } from './config';
import { getDbPool, closeDbPool } from './database';
import { tempUploadService } from './services/temp-upload';

// Commands
import { handleUploadCV } from './commands/upload-cv';
import { handleUploadProject } from './commands/upload-project';
import { handleUploadVacancy } from './commands/upload-vacancy';
import { handleChat } from './commands/chat';
import { handleMatchVacancy } from './commands/match-vacancy';
import { handleLinkUser } from './commands/link-user';

// Interactions
import {
  handleUserSelectCV,
  handleUserSelectProject,
  handleMatchVacancyButton,
  handleRefreshVacancyMatches,
} from './interactions/user-select';

// Validate configuration
try {
  validateConfig();
  console.log('✅ Configuration validated');
} catch (error) {
  console.error('❌ Configuration error:', error);
  process.exit(1);
}

// Create Express receiver for custom routes
const receiver = new ExpressReceiver({
  signingSecret: config.slack.signingSecret,
});

// Create Slack app
const app = new App({
  token: config.slack.botToken,
  receiver,
});

// Health check endpoint
receiver.router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register slash commands
app.command('/upload-cv', handleUploadCV);
app.command('/upload-project', handleUploadProject);
app.command('/upload-vacancy', handleUploadVacancy);
app.command('/chat', handleChat);
app.command('/match-vacancy', handleMatchVacancy);
app.command('/link-user', handleLinkUser);

// Register interactive components
app.action('select_user_cv', handleUserSelectCV);
app.action('select_user_project', handleUserSelectProject);
app.action(/^match_vacancy_/, handleMatchVacancyButton);
app.action(/^refresh_vacancy_matches_/, handleRefreshVacancyMatches);

// Cleanup job for expired upload links (runs every 5 minutes)
setInterval(async () => {
  try {
    const deleted = await tempUploadService.cleanupExpiredLinks();
    if (deleted > 0) {
      console.log(`🧹 Cleaned up ${deleted} expired upload links`);
    }
  } catch (error) {
    console.error('Error cleaning up expired links:', error);
  }
}, 5 * 60 * 1000);

// Start the app
(async () => {
  try {
    // Test database connection
    await getDbPool();

    // Start the server
    await app.start(config.service.port);
    console.log(`⚡️ Slack bot is running on port ${config.service.port}`);
    console.log(`📍 Environment: ${config.service.env}`);
    console.log(`🔗 CV Tool Base URL: ${config.cvTool.baseUrl}`);
  } catch (error) {
    console.error('❌ Failed to start the app:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await closeDbPool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await closeDbPool();
  process.exit(0);
});

