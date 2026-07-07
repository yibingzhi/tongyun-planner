import type { StorageProvider, StorageBackendType, OSSConfig } from "./types";

export class OSSStorageProvider implements StorageProvider {
  readonly type: StorageBackendType = "oss";
  readonly displayName = "阿里云 OSS";
  readonly supportsPublicUrl = true;
  private config: OSSConfig | null = null;

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
    localStorage.setItem("tongyun_oss_config", JSON.stringify(this.config));
  }

  setConfig(config: OSSConfig): void {
    this.config = config;
    this.saveToStorage();
  }

  isConfigured(): boolean {
    return !!(this.config?.region && this.config?.bucket && this.config?.accessKeyId && this.config?.accessKeySecret);
  }

  async test(): Promise<boolean> {
    return false;
  }

  async uploadFile(_path: string, _data: Uint8Array, _mime: string): Promise<string> {
    throw new Error("OSS not yet implemented — install ali-oss and implement");
  }

  async downloadFile(_path: string): Promise<Uint8Array | null> {
    throw new Error("OSS not yet implemented");
  }

  async deleteFile(_path: string): Promise<void> {
    throw new Error("OSS not yet implemented");
  }

  async listFiles(_prefix: string): Promise<string[]> {
    throw new Error("OSS not yet implemented");
  }

  getPublicUrl(path: string): string | null {
    if (!this.config) return null;
    const ep = this.config.endpoint || `oss-${this.config.region}.aliyuncs.com`;
    return `https://${this.config.bucket}.${ep}/${path}`;
  }

  async getFileUrl(path: string, mime: string): Promise<string> {
    const url = this.getPublicUrl(path);
    if (url) return url;
    const data = await this.downloadFile(path);
    if (!data) throw new Error("File not found: " + path);
    return URL.createObjectURL(new Blob([data], { type: mime }));
  }

  async writeText(_path: string, _content: string): Promise<void> {
    throw new Error("OSS not yet implemented");
  }

  async readText(_path: string): Promise<string | null> {
    throw new Error("OSS not yet implemented");
  }
}
