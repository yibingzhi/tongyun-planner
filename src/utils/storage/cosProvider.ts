import type COS from "cos-js-sdk-v5";
import type { StorageProvider, StorageBackendType, COSConfig } from "./types";

export class COSStorageProvider implements StorageProvider {
  readonly type: StorageBackendType = "cos";
  readonly displayName = "腾讯云 COS";
  readonly supportsPublicUrl = true;
  private config: COSConfig | null = null;
  private client: COS | null = null;
  private clientSig = "";

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem("tongyun_cos_config");
      if (raw) this.config = JSON.parse(raw);
    } catch { /* ignore */ }
  }

  saveToStorage(): void {
    if (this.config) localStorage.setItem("tongyun_cos_config", JSON.stringify(this.config));
  }

  setConfig(config: COSConfig): void {
    this.config = config;
    this.client = null;
    this.clientSig = "";
    this.saveToStorage();
  }

  isConfigured(): boolean {
    return !!(this.config?.region && this.config?.bucket && this.config?.secretId && this.config?.secretKey);
  }

  private async getClient(): Promise<COS> {
    if (!this.config) throw new Error("COS 未配置");
    const sig = `${this.config.region}|${this.config.bucket}|${this.config.secretId}|${this.config.secretKey}`;
    if (!this.client || this.clientSig !== sig) {
      const COSMod = (await import("cos-js-sdk-v5")).default;
      this.client = new COSMod({ SecretId: this.config.secretId, SecretKey: this.config.secretKey });
      this.clientSig = sig;
    }
    return this.client;
  }

  async test(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await (await this.getClient()).headBucket({ Bucket: this.config!.bucket, Region: this.config!.region });
      return true;
    } catch {
      return false;
    }
  }

  async uploadFile(path: string, data: Uint8Array, mime: string): Promise<string> {
    await (await this.getClient()).putObject({
      Bucket: this.config!.bucket,
      Region: this.config!.region,
      Key: path,
      Body: data,
      ContentType: mime,
    });
    return path;
  }

  async downloadFile(path: string): Promise<Uint8Array | null> {
    try {
      const res = await (await this.getClient()).getObject({
        Bucket: this.config!.bucket,
        Region: this.config!.region,
        Key: path,
      });
      const body = res.Body as unknown;
      if (body instanceof Uint8Array) return body;
      if (typeof body === "string") return new TextEncoder().encode(body);
      throw new Error("未知的文件内容类型");
    } catch (e: any) {
      const code = e?.error?.Code || e?.code;
      if (code === "NoSuchKey" || e?.statusCode === 404 || e?.status === 404) return null;
      throw e;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await (await this.getClient()).deleteObject({
        Bucket: this.config!.bucket,
        Region: this.config!.region,
        Key: path,
      });
    } catch (e: any) {
      const code = e?.error?.Code || e?.code;
      if (code === "NoSuchKey" || e?.statusCode === 404 || e?.status === 404) return;
      throw e;
    }
  }

  async listFiles(prefix: string): Promise<string[]> {
    const data: any = await (await this.getClient()).getBucket({
      Bucket: this.config!.bucket,
      Region: this.config!.region,
      Prefix: prefix,
      MaxKeys: 1000,
    } as any);
    return (data.Contents || []).map((c: any) => c.Key);
  }

  getPublicUrl(path: string): string | null {
    if (!this.isConfigured()) return null;
    return `https://${this.config!.bucket}.cos.${this.config!.region}.myqcloud.com/${path}`;
  }

  async getFileUrl(path: string, _mime: string): Promise<string> {
    const url = this.getPublicUrl(path);
    if (url) return url;
    const data = await this.downloadFile(path);
    if (!data) throw new Error("File not found: " + path);
    return URL.createObjectURL(new Blob([data], { type: _mime }));
  }

  async writeText(path: string, content: string): Promise<void> {
    await (await this.getClient()).putObject({
      Bucket: this.config!.bucket,
      Region: this.config!.region,
      Key: path,
      Body: content,
      ContentType: "application/json; charset=utf-8",
    });
  }

  async readText(path: string): Promise<string | null> {
    try {
      const res = await (await this.getClient()).getObject({
        Bucket: this.config!.bucket,
        Region: this.config!.region,
        Key: path,
      });
      const body = res.Body as unknown;
      if (typeof body === "string") return body;
      if (body instanceof Uint8Array) return new TextDecoder().decode(body);
      return null;
    } catch (e: any) {
      const code = e?.error?.Code || e?.code;
      if (code === "NoSuchKey" || e?.statusCode === 404 || e?.status === 404) return null;
      throw e;
    }
  }
}
