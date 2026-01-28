import { VercelClient } from './vercelClient';
import { VercelEnvVariable, VercelEnvResponse, VercelDeployment, VercelDeploymentsResponse } from './types';

export class EnvManager {
  private readonly client: VercelClient;
  private readonly projectId: string;
  private readonly deployHookUrl?: string;

  constructor(client: VercelClient, projectId: string, deployHookUrl?: string) {
    this.client = client;
    this.projectId = projectId;
    this.deployHookUrl = deployHookUrl;
  }

  async listEnvVariables(): Promise<VercelEnvVariable[]> {
    const response = await this.client.get<VercelEnvResponse>(
      `/v9/projects/${this.projectId}/env`
    );

    if (!response.success) {
      throw new Error(
        `Failed to list env variables: ${response.error?.message || 'Unknown error'}`
      );
    }

    return response.data?.envs || [];
  }

  async findEnvVariable(key: string, target: string): Promise<VercelEnvVariable | null> {
    const envVars = await this.listEnvVariables();
    return envVars.find(
      (env) => env.key === key && env.target.includes(target as 'production' | 'preview' | 'development')
    ) || null;
  }

  async deleteEnvVariable(envId: string): Promise<void> {
    console.log(`[EnvManager] Deleting env variable with ID: ${envId}`);

    const response = await this.client.delete(
      `/v9/projects/${this.projectId}/env/${envId}`
    );

    if (!response.success) {
      if (response.error?.statusCode === 404) {
        console.log(`[EnvManager] Env variable ${envId} not found, skipping deletion`);
        return;
      }
      throw new Error(
        `Failed to delete env variable: ${response.error?.message || 'Unknown error'}`
      );
    }

    console.log(`[EnvManager] Successfully deleted env variable: ${envId}`);
  }

  async createEnvVariable(
    key: string,
    value: string,
    target: ('production' | 'preview' | 'development')[]
  ): Promise<VercelEnvVariable> {
    console.log(`[EnvManager] Creating env variable: ${key} for targets: ${target.join(', ')}`);

    const response = await this.client.post<VercelEnvVariable>(
      `/v9/projects/${this.projectId}/env`,
      {
        key,
        value,
        type: 'encrypted',
        target,
      }
    );

    if (!response.success) {
      throw new Error(
        `Failed to create env variable: ${response.error?.message || 'Unknown error'}`
      );
    }

    if (!response.data) {
      throw new Error('Create env variable succeeded but no data returned');
    }

    console.log(`[EnvManager] Successfully created env variable: ${key}`);
    return response.data;
  }

  async upsertEnvVariable(
    key: string,
    value: string,
    target: ('production' | 'preview' | 'development')[]
  ): Promise<VercelEnvVariable> {
    console.log(`[EnvManager] Upserting env variable: ${key}`);

    for (const t of target) {
      const existing = await this.findEnvVariable(key, t);
      if (existing && existing.id) {
        await this.deleteEnvVariable(existing.id);
      }
    }

    return this.createEnvVariable(key, value, target);
  }

  async getLatestDeployment(): Promise<VercelDeployment | null> {
    const response = await this.client.get<VercelDeploymentsResponse>(
      `/v6/deployments`,
      { projectId: this.projectId, limit: '1', target: 'production' }
    );

    if (!response.success) {
      throw new Error(
        `Failed to get deployments: ${response.error?.message || 'Unknown error'}`
      );
    }

    const deployments = response.data?.deployments || [];
    return deployments.length > 0 ? deployments[0] : null;
  }

  async triggerRedeploy(): Promise<VercelDeployment | null> {
    console.log('[EnvManager] Triggering redeploy...');

    if (!this.deployHookUrl) {
      console.log('[EnvManager] No deploy hook URL configured, skipping redeploy');
      console.log('[EnvManager] To enable auto-redeploy, create a Deploy Hook in Vercel:');
      console.log('[EnvManager]   Project Settings → Git → Deploy Hooks → Create Hook');
      console.log('[EnvManager]   Then set PROJECT_B_DEPLOY_HOOK in your env');
      return null;
    }

    console.log('[EnvManager] Calling deploy hook...');

    const response = await fetch(this.deployHookUrl, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(
        `Failed to trigger redeploy: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json() as { job?: { id?: string; createdAt?: number } };
    
    console.log(`[EnvManager] Redeploy triggered successfully. Job ID: ${data.job?.id || 'unknown'}`);
    
    return {
      uid: data.job?.id || 'hook-triggered',
      url: 'pending',
      name: 'deploy-hook-triggered',
    };
  }

  async updateEnvAndRedeploy(
    key: string,
    value: string
  ): Promise<{ envVariable: VercelEnvVariable; deployment: VercelDeployment | null }> {
    console.log(`[EnvManager] Starting env update and redeploy for key: ${key}`);

    const envVariable = await this.upsertEnvVariable(key, value, ['production']);

    const deployment = await this.triggerRedeploy();

    console.log('[EnvManager] Env update and redeploy completed successfully');
    return { envVariable, deployment };
  }
}
