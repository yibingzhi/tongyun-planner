import type OSS from "ali-oss";
import type { StorageProvider, StorageBackendType, OSSConfig } from "./types";

export class OSSStorageProvider implements StorageProvider {
  readonly type: StorageBackendType = "oss";
  readonly displayName = "阿里云 OSS";
  readonly supportsPublicUrl = true;
  private config: OSSConfig | null = null;
  private client: OSS | null = null;
  private clientSig = "";

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem("tongyun_oss_config");
      if (raw) this.config = JSON.parse(raw);
    } catch { /* ignore */ }
  }

  saveToStorage(): void {
    if (this.config) localStorage.setItem("tongyun_oss_config", JSON.stringify(this.config));
  }

  setConfig(config: OSSConfig): void {
    this.config = config;
    this.client = null;
    this.clientSig = "";
    this.saveToStorage();
  }

  isConfigured(): boolean {
    return !!(this.config?.region && this.config?.bucket && this.config?.accessKeyId && this.config?.accessKeySecret);
  }

  private async getClient(): Promise<OSS> {
    if (!this.config) throw new Error("OSS 未配置");
    const sig = `${this.config.region}|${this.config.bucket}|${this.config.accessKeyId}|${this.config.accessKeySecret}|${this.config.endpoint || ""}`;
    if (!this.client || this.clientSig !== sig) {
      const OSSMod = (await import("ali-oss")).default;
      this.client = new OSSMod({
        region: this.config.region,
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
        bucket: this.config.bucket,
        endpoint: this.config.endpoint,
        secure: true,
      });
      this.clientSig = sig;
    }
    return this.client;
  }

  async test(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await (await this.getClient()).list({ "max-keys": 1 }, {});
      return true;
    } catch {
      return false;
    }
  }

  async uploadFile(path: string, data: Uint8Array, mime: string): Promise<string> {
    await (await this.getClient()).put(path, data, { mime });
    return path;
  }

  async downloadFile(path: string): Promise<Uint8Array | null> {
    try {
      const result = await (await this.getClient()).get(path);
      return new Uint8Array(result.content as Uint8Array);
    } catch (e: any) {
      if (e?.name === "NoSuchKey" || e?.code === "NoSuchKey" || e?.status === 404) return null;
      throw e;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await (await this.getClient()).delete(path);
    } catch (e: any) {
      if (e?.name === "NoSuchKey" || e?.code === "NoSuchKey" || e?.status === 404) return;
      throw e;
    }
  }

  async listFiles(prefix: string): Promise<string[]> {
    const result = await (await this.getClient()).list({ prefix, "max-keys": 1000 }, {});
    return (result.objects || []).map((o) => o.name);
  }

  getPublicUrl(path: string): string | null {
    if (!this.isConfigured()) return null;
    const ep = this.config!.endpoint || `oss-${this.config!.region}.aliyuncs.com`;
    return `https://${this.config!.bucket}.${ep}/${path}`;
  }

  async getFileUrl(path: string, _mime: string): Promise<string> {
    const url = this.getPublicUrl(path);
    if (url) return url;
    const data = await this.downloadFile(path);
    if (!data) throw new Error("File not found: " + path);
    return URL.createObjectURL(new Blob([data], { type: _mime }));
  }

  async writeText(path: string, content: string): Promise<void> {
    await (await this.getClient()).put(path, content, { mime: "application/json; charset=utf-8" });
  }

  async readText(path: string): Promise<string | null> {
    try {
      const result = await (await this.getClient()).get(path);
      const content = result.content as Uint8Array;
      if (content instanceof Uint8Array) return new TextDecoder().decode(content);
      return null;
    } catch (e: any) {
      if (e?.name === "NoSuchKey" || e?.code === "NoSuchKey" || e?.status === 404) return null;
      throw e;
    }
  }
}
