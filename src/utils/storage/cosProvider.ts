import type { StorageProvider, StorageBackendType, COSConfig } from "./types";

export class COSStorageProvider implements StorageProvider {
  readonly type: StorageBackendType = "cos";
  readonly displayName = "腾讯云 COS";
  readonly supportsPublicUrl = true;
  private config: COSConfig | null = null;

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
    localStorage.setItem("tongyun_cos_config", JSON.stringify(this.config));
  }

  setConfig(config: COSConfig): void {
    this.config = config;
    this.saveToStorage();
  }

  isConfigured(): boolean {
    return !!(this.config?.region && this.config?.bucket && this.config?.secretId && this.config?.secretKey);
  }

  async test(): Promise<boolean> {
    return false;
  }

  async uploadFile(_path: string, _data: Uint8Array, _mime: string): Promise<string> {
    throw new Error("COS not yet implemented — install cos-js-sdk-v5 and implement");
  }

  async downloadFile(_path: string): Promise<Uint8Array | null> {
    throw new Error("COS not yet implemented");
  }

  async deleteFile(_path: string): Promise<void> {
    throw new Error("COS not yet implemented");
  }

  async listFiles(_prefix: string): Promise<string[]> {
    throw new Error("COS not yet implemented");
  }

  getPublicUrl(path: string): string | null {
    if (!this.config) return null;
    return `https://${this.config.bucket}.cos.${this.config.region}.myqcloud.com/${path}`;
  }

  async getFileUrl(path: string, mime: string): Promise<string> {
    const url = this.getPublicUrl(path);
    if (url) return url;
    const data = await this.downloadFile(path);
    if (!data) throw new Error("File not found: " + path);
    return URL.createObjectURL(new Blob([data], { type: mime }));
  }

  async writeText(_path: string, _content: string): Promise<void> {
    throw new Error("COS not yet implemented");
  }

  async readText(_path: string): Promise<string | null> {
    throw new Error("COS not yet implemented");
  }
}
