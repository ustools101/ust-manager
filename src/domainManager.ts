import { VercelClient } from './vercelClient';
import { VercelDomain, VercelDomainsResponse } from './types';

export class DomainManager {
  private readonly client: VercelClient;
  private readonly projectId: string;

  constructor(client: VercelClient, projectId: string) {
    this.client = client;
    this.projectId = projectId;
  }

  async listDomains(): Promise<VercelDomain[]> {
    const response = await this.client.get<VercelDomainsResponse>(
      `/v10/projects/${this.projectId}/domains`
    );

    if (!response.success) {
      throw new Error(
        `Failed to list domains: ${response.error?.message || 'Unknown error'}`
      );
    }

    return response.data?.domains || [];
  }

  async removeDomain(domain: string): Promise<void> {
    console.log(`[DomainManager] Removing domain: ${domain}`);
    
    const response = await this.client.delete(
      `/v10/projects/${this.projectId}/domains/${encodeURIComponent(domain)}`
    );

    if (!response.success) {
      if (response.error?.code === 'not_found' || response.error?.statusCode === 404) {
        console.log(`[DomainManager] Domain ${domain} not found, skipping removal`);
        return;
      }
      throw new Error(
        `Failed to remove domain ${domain}: ${response.error?.message || 'Unknown error'}`
      );
    }

    console.log(`[DomainManager] Successfully removed domain: ${domain}`);
  }

  async addDomain(domain: string): Promise<VercelDomain> {
    console.log(`[DomainManager] Adding domain: ${domain}`);

    const response = await this.client.post<VercelDomain>(
      `/v10/projects/${this.projectId}/domains`,
      { name: domain }
    );

    if (!response.success) {
      if (response.error?.code === 'domain_already_in_use' || 
          response.error?.code === 'domain_already_exists') {
        console.log(`[DomainManager] Domain ${domain} already exists, treating as success`);
        const domains = await this.listDomains();
        const existingDomain = domains.find((d) => d.name === domain);
        if (existingDomain) {
          return existingDomain;
        }
        throw new Error(`Domain ${domain} reported as existing but not found in project`);
      }
      throw new Error(
        `Failed to add domain ${domain}: ${response.error?.message || 'Unknown error'}`
      );
    }

    if (!response.data) {
      throw new Error('Add domain succeeded but no data returned');
    }

    console.log(`[DomainManager] Successfully added domain: ${domain}`);
    return response.data;
  }

  async removeAllDomains(): Promise<void> {
    console.log('[DomainManager] Fetching all domains for removal...');
    const domains = await this.listDomains();

    if (domains.length === 0) {
      console.log('[DomainManager] No domains to remove');
      return;
    }

    console.log(`[DomainManager] Found ${domains.length} domain(s) to remove`);

    for (const domain of domains) {
      await this.removeDomain(domain.name);
    }

    console.log('[DomainManager] All domains removed successfully');
  }

  async rotateDomain(newDomain: string): Promise<VercelDomain> {
    console.log(`[DomainManager] Starting domain rotation to: ${newDomain}`);

    await this.removeAllDomains();

    const addedDomain = await this.addDomain(newDomain);

    console.log(`[DomainManager] Domain rotation completed. New domain: ${newDomain}`);
    return addedDomain;
  }

  async removeAllDomainsExcept(keepDomain: string): Promise<void> {
    console.log(`[DomainManager] Removing all domains except: ${keepDomain}`);
    const domains = await this.listDomains();

    const domainsToRemove = domains.filter((d) => d.name !== keepDomain);

    if (domainsToRemove.length === 0) {
      console.log('[DomainManager] No old domains to remove');
      return;
    }

    console.log(`[DomainManager] Found ${domainsToRemove.length} old domain(s) to remove`);

    for (const domain of domainsToRemove) {
      await this.removeDomain(domain.name);
    }

    console.log('[DomainManager] Old domains removed successfully');
  }

  async rotateDomainAddFirst(newDomain: string): Promise<VercelDomain> {
    console.log(`[DomainManager] Starting domain rotation (add first) to: ${newDomain}`);

    // Step 1: Add new domain first
    const addedDomain = await this.addDomain(newDomain);

    // Step 2: Remove all old domains (except the new one)
    await this.removeAllDomainsExcept(newDomain);

    console.log(`[DomainManager] Domain rotation completed. New domain: ${newDomain}`);
    return addedDomain;
  }
}
