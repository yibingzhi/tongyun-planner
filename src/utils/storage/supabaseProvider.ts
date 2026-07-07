import type { StorageProvider, StorageBackendType, SupabaseStorageConfig } from "./types";

export class SupabaseStorageProvider implements StorageProvider {
  readonly type: StorageBackendType = "supabase";
  readonly displayName = "Supabase Storage";
  readonly supportsPublicUrl = true;
  private config: SupabaseStorageConfig | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const url = localStorage.getItem("tongyun_supabase_url");
    const anonKey = localStorage.getItem("tongyun_supabase_anon_key");
    if (url && anonKey) {
      this.config = { url, anonKey, bucket: "tongyun" };
    }
  }

  isConfigured(): boolean {
    return !!(this.config?.url && this.config?.anonKey);
  }

  async test(): Promise<boolean> {
    return false;
  }

  async uploadFile(_path: string, _data: Uint8Array, _mime: string): Promise<string> {
    throw new Error("Supabase Storage not yet implemented — use @supabase/supabase-js storage API");
  }

  async downloadFile(_path: string): Promise<Uint8Array | null> {
    throw new Error("Supabase Storage not yet implemented");
  }

  async deleteFile(_path: string): Promise<void> {
    throw new Error("Supabase Storage not yet implemented");
  }

  async listFiles(_prefix: string): Promise<string[]> {
    throw new Error("Supabase Storage not yet implemented");
  }

  getPublicUrl(path: string): string | null {
    if (!this.config) return null;
    return `${this.config.url}/storage/v1/object/public/${this.config.bucket}/${path}`;
  }

  async getFileUrl(path: string, mime: string): Promise<string> {
    const url = this.getPublicUrl(path);
    if (url) return url;
    const data = await this.downloadFile(path);
    if (!data) throw new Error("File not found: " + path);
    return URL.createObjectURL(new Blob([data], { type: mime }));
  }

  async writeText(_path: string, _content: string): Promise<void> {
    throw new Error("Supabase Storage not yet implemented");
  }

  async readText(_path: string): Promise<string | null> {
    throw new Error("Supabase Storage not yet implemented");
  }
}
