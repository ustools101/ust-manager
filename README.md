# Vercel Domain Rotation Bot

Automated infrastructure bot that manages Vercel domain rotation and environment variable synchronization via GitHub Actions.

## Features

- **Domain Rotation**: Removes all existing domains from Project A and adds a new domain
- **Environment Variable Sync**: Updates environment variable in Project B with the new domain
- **Auto Redeploy**: Triggers production redeploy of Project B after env update
- **Idempotent Execution**: Safe to run multiple times without side effects
- **Rate Limit Handling**: Automatic retry with exponential backoff
- **Team & Personal Account Support**: Works with both Vercel team and personal accounts

## Setup

### 1. GitHub Secrets

Configure the following secrets in your GitHub repository (`Settings > Secrets and variables > Actions`):

| Secret | Required | Description |
|--------|----------|-------------|
| `VERCEL_TOKEN` | ✅ | Vercel API token ([create here](https://vercel.com/account/tokens)) |
| `VERCEL_TEAM_ID` | ❌ | Vercel team ID (only for team accounts) |
| `PROJECT_A_ID` | ✅ | Vercel project ID for domain rotation |
| `PROJECT_B_ID` | ✅ | Vercel project ID for env variable update |
| `NEW_DOMAIN` | ✅ | Domain to add to Project A |
| `ENV_VAR_KEY` | ✅ | Environment variable key to update in Project B |

### 2. Cron Schedule

Edit `.github/workflows/vercel-domain-bot.yml` to adjust the schedule:

```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
```

Common cron patterns:
- `0 */1 * * *` - Every hour
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight
- `0 0 * * 0` - Weekly on Sunday

### 3. Manual Trigger

You can also trigger the workflow manually from GitHub Actions with an optional domain override.

## Local Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run (requires env vars)
export VERCEL_TOKEN="your-token"
export PROJECT_A_ID="prj_xxx"
export PROJECT_B_ID="prj_yyy"
export NEW_DOMAIN="example.com"
export ENV_VAR_KEY="API_DOMAIN"
npm start
```

## Project Structure

```
/src
  ├── index.ts           # Entry point
  ├── vercelClient.ts    # Vercel API wrapper with retry logic
  ├── domainManager.ts   # Project A domain operations
  ├── envManager.ts      # Project B env var operations
  └── types.ts           # TypeScript type definitions
/.github/workflows
  └── vercel-domain-bot.yml  # GitHub Actions workflow
```

## API Endpoints Used

| Operation | Endpoint |
|-----------|----------|
| List domains | `GET /v10/projects/{projectId}/domains` |
| Remove domain | `DELETE /v10/projects/{projectId}/domains/{domain}` |
| Add domain | `POST /v10/projects/{projectId}/domains` |
| List env vars | `GET /v9/projects/{projectId}/env` |
| Create env var | `POST /v9/projects/{projectId}/env` |
| Delete env var | `DELETE /v9/projects/{projectId}/env/{id}` |
| List deployments | `GET /v6/deployments` |
| Create deployment | `POST /v13/deployments` |

## License

MIT
