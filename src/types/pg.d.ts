declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string;
  }

  export class Pool {
    public constructor(config?: PoolConfig);
    public readonly ended: boolean;
    public end(): Promise<void>;
  }
}
