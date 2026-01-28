import { Config } from './types';
import { VercelClient } from './vercelClient';
import { DomainManager } from './domainManager';
import { EnvManager } from './envManager';
import { generateRandomDomain } from './domainGenerator';
import { TelegramWebhookManager, sleep } from './telegramWebhook';

function loadConfig(): Config {
  const projectAToken = process.env.PROJECT_A_TOKEN;
  const projectAId = process.env.PROJECT_A_ID;
  const projectATeamId = process.env.PROJECT_A_TEAM_ID;

  const projectBToken = process.env.PROJECT_B_TOKEN;
  const projectBId = process.env.PROJECT_B_ID;
  const projectBTeamId = process.env.PROJECT_B_TEAM_ID;
  const projectBDeployHook = process.env.PROJECT_B_DEPLOY_HOOK;

  const newDomain = process.env.NEW_DOMAIN;
  const envVarKey = process.env.ENV_VAR_KEY;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookWaitSeconds = parseInt(process.env.WEBHOOK_WAIT_SECONDS || '60', 10);

  if (!projectAToken) {
    throw new Error('PROJECT_A_TOKEN environment variable is required');
  }
  if (!projectAId) {
    throw new Error('PROJECT_A_ID environment variable is required');
  }
  if (!projectBToken) {
    throw new Error('PROJECT_B_TOKEN environment variable is required');
  }
  if (!projectBId) {
    throw new Error('PROJECT_B_ID environment variable is required');
  }
  if (!envVarKey) {
    throw new Error('ENV_VAR_KEY environment variable is required');
  }

  return {
    projectA: {
      token: projectAToken,
      teamId: projectATeamId || undefined,
      projectId: projectAId,
    },
    projectB: {
      token: projectBToken,
      teamId: projectBTeamId || undefined,
      projectId: projectBId,
      deployHookUrl: projectBDeployHook || undefined,
    },
    newDomain: newDomain || undefined,
    envVarKey,
    telegramBotToken: telegramBotToken || undefined,
    webhookWaitSeconds,
  };
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('[Bot] Vercel Domain Rotation Bot - Starting');
  console.log(`[Bot] Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  const config = loadConfig();

  // Generate random domain if not specified
  const newDomain = config.newDomain || generateRandomDomain();

  console.log('[Bot] Configuration loaded successfully');
  console.log(`[Bot] Project A ID: ${config.projectA.projectId}`);
  console.log(`[Bot] Project A Team ID: ${config.projectA.teamId || 'Not set (personal account)'}`);
  console.log(`[Bot] Project B ID: ${config.projectB.projectId}`);
  console.log(`[Bot] Project B Team ID: ${config.projectB.teamId || 'Not set (personal account)'}`);
  console.log(`[Bot] New Domain: ${newDomain} ${config.newDomain ? '(from env)' : '(auto-generated)'}`);
  console.log(`[Bot] Env Var Key: ${config.envVarKey}`);
  console.log(`[Bot] Webhook Wait: ${config.webhookWaitSeconds} seconds`);
  console.log(`[Bot] Telegram Bot: ${config.telegramBotToken ? 'Configured' : 'Not configured'}`);

  const clientA = new VercelClient(config.projectA.token, config.projectA.teamId);
  const clientB = new VercelClient(config.projectB.token, config.projectB.teamId);

  // Step 1: Add new domain to Project A (add first, then remove old)
  console.log('\n' + '-'.repeat(60));
  console.log('[Bot] Step 1: Add New Domain to Project A');
  console.log('-'.repeat(60));

  const domainManager = new DomainManager(clientA, config.projectA.projectId);
  const addedDomain = await domainManager.rotateDomainAddFirst(newDomain);

  console.log(`[Bot] Domain added: ${addedDomain.name}`);
  console.log(`[Bot] Domain verified: ${addedDomain.verified}`);

  // Step 2: Update environment variable on Project B and trigger redeploy
  console.log('\n' + '-'.repeat(60));
  console.log('[Bot] Step 2: Update Env Variable on Project B & Redeploy');
  console.log('-'.repeat(60));

  const envManager = new EnvManager(clientB, config.projectB.projectId, config.projectB.deployHookUrl);
  const domainWithProtocol = `https://${newDomain}`;
  const { envVariable, deployment } = await envManager.updateEnvAndRedeploy(
    config.envVarKey,
    domainWithProtocol
  );

  console.log(`[Bot] Env variable updated: ${envVariable.key}`);
  if (deployment) {
    const deploymentId = deployment.uid || deployment.id;
    console.log(`[Bot] Redeploy triggered: ${deploymentId}`);
    console.log(`[Bot] Deployment URL: ${deployment.url}`);
  }

  // Step 3: Wait for deployment to complete
  console.log('\n' + '-'.repeat(60));
  console.log('[Bot] Step 3: Waiting for Deployment');
  console.log('-'.repeat(60));

  console.log(`[Bot] Waiting ${config.webhookWaitSeconds} seconds for deployment to complete...`);
  await sleep(config.webhookWaitSeconds * 1000);
  console.log('[Bot] Wait complete');

  // Step 4: Activate Telegram webhook
  console.log('\n' + '-'.repeat(60));
  console.log('[Bot] Step 4: Activate Telegram Webhook');
  console.log('-'.repeat(60));

  if (config.telegramBotToken) {
    const webhookUrl = `https://${newDomain}/api/webhook`;
    const telegramManager = new TelegramWebhookManager(config.telegramBotToken);
    const webhookResult = await telegramManager.setWebhook(webhookUrl);
    console.log(`[Bot] Telegram webhook activated: ${webhookResult.description}`);
  } else {
    console.log('[Bot] Telegram bot token not configured, skipping webhook activation');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('[Bot] Execution Summary');
  console.log('='.repeat(60));
  console.log(`[Bot] ✓ Project A domain rotated to: ${newDomain}`);
  console.log(`[Bot] ✓ Project B env var "${config.envVarKey}" updated`);
  if (deployment) {
    const deploymentId = deployment.uid || deployment.id;
    console.log(`[Bot] ✓ Project B redeploy triggered (ID: ${deploymentId})`);
  } else {
    console.log(`[Bot] ⚠ Project B redeploy skipped (no deploy hook configured)`);
  }
  if (config.telegramBotToken) {
    console.log(`[Bot] ✓ Telegram webhook activated`);
  }
  console.log(`[Bot] Completed at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
}

main().catch((error: Error) => {
  console.error('\n' + '!'.repeat(60));
  console.error('[Bot] FATAL ERROR');
  console.error('!'.repeat(60));
  console.error(`[Bot] Error: ${error.message}`);
  console.error(`[Bot] Stack: ${error.stack}`);
  console.error('!'.repeat(60));
  process.exit(1);
});
