declare module "cos-js-sdk-v5" {
  export interface CosObjectParams {
    Bucket: string;
    Region: string;
    Key: string;
    Body?: Uint8Array | ArrayBuffer | Blob | string;
    ContentType?: string;
    CacheControl?: string;
  }

  export interface CosGetResult {
    statusCode: number;
    headers: Record<string, string>;
    Body: Uint8Array;
  }

  export interface CosPutResult {
    statusCode: number;
    headers: Record<string, string>;
    Location?: string;
    ETag?: string;
    Key?: string;
    Bucket?: string;
  }

  export interface CosError {
    statusCode?: number;
    error?: { Code?: string; Message?: string };
    message?: string;
  }

  export default class COS {
    constructor(options: { SecretId: string; SecretKey: string });
    putObject(params: CosObjectParams): Promise<CosPutResult>;
    getObject(params: CosObjectParams): Promise<CosGetResult>;
    deleteObject(params: CosObjectParams): Promise<{ statusCode: number }>;
    getBucket(params: { Bucket: string; Region: string }): Promise<unknown>;
    headBucket(params: { Bucket: string; Region: string }): Promise<unknown>;
  }
}
