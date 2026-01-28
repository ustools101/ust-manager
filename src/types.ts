export interface ProjectConfig {
  token: string;
  teamId?: string;
  projectId: string;
  deployHookUrl?: string;
}

export interface Config {
  projectA: ProjectConfig;
  projectB: ProjectConfig;
  newDomain?: string;
  envVarKey: string;
  telegramBotToken?: string;
  webhookWaitSeconds: number;
}

export interface VercelDomain {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string | null;
  redirectStatusCode?: number | null;
  gitBranch?: string | null;
  updatedAt?: number;
  createdAt?: number;
  verified: boolean;
  verification?: VercelDomainVerification[];
}

export interface VercelDomainVerification {
  type: string;
  domain: string;
  value: string;
  reason: string;
}

export interface VercelDomainsResponse {
  domains: VercelDomain[];
  pagination?: {
    count: number;
    next: number | null;
    prev: number | null;
  };
}

export interface VercelEnvVariable {
  id?: string;
  key: string;
  value: string;
  type: 'system' | 'secret' | 'encrypted' | 'plain' | 'sensitive';
  target: ('production' | 'preview' | 'development')[];
  configurationId?: string | null;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string | null;
  updatedBy?: string | null;
  gitBranch?: string;
  edgeConfigId?: string | null;
  edgeConfigTokenId?: string | null;
  contentHint?: {
    type: string;
    storeId?: string;
  } | null;
  internalContentHint?: {
    type: string;
    encryptedValue?: string;
  } | null;
  decrypted?: boolean;
  comment?: string;
}

export interface VercelEnvResponse {
  envs: VercelEnvVariable[];
}

export interface VercelDeployment {
  uid: string;
  id?: string;
  url: string;
  name: string;
  state?: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  readyState?: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  createdAt?: number;
}

export interface VercelDeploymentsResponse {
  deployments: VercelDeployment[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: VercelApiError;
}

export interface VercelApiError {
  code: string;
  message: string;
  statusCode?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT';
