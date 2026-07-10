import type { StorageProvider, StorageBackendType, SupabaseStorageConfig } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

export class SupabaseStorageProvider implements StorageProvider {
  readonly type: StorageBackendType = "supabase";
  readonly displayName = "Supabase Storage";
  readonly supportsPublicUrl = true;
  private config: SupabaseStorageConfig | null = null;
  private client: SupabaseClient | null = null;
  private clientSig = "";

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

  saveToStorage(): void {
    if (this.config) {
      localStorage.setItem("tongyun_supabase_url", this.config.url);
      localStorage.setItem("tongyun_supabase_anon_key", this.config.anonKey);
    }
  }

  setConfig(config: SupabaseStorageConfig): void {
    this.config = config;
    this.client = null;
    this.clientSig = "";
    this.saveToStorage();
  }

  isConfigured(): boolean {
    if (!this.config) this.loadFromStorage();
    return !!(this.config?.url && this.config?.anonKey);
  }

  private async getClient(): Promise<SupabaseClient> {
    if (!this.config) throw new Error("Supabase 未配置");
    const sig = `${this.config.url}|${this.config.anonKey}|${this.config.bucket}`;
    if (!this.client || this.clientSig !== sig) {
      const { createClient } = await import("@supabase/supabase-js");
      this.client = createClient(this.config.url, this.config.anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      this.clientSig = sig;
    }
    return this.client;
  }

  async test(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const { error } = await (await this.getClient()).storage.from(this.config!.bucket).list("", { limit: 1 });
      return !error;
    } catch {
      return false;
    }
  }

  async uploadFile(path: string, data: Uint8Array, mime: string): Promise<string> {
    const { error } = await (await this.getClient()).storage
      .from(this.config!.bucket)
      .upload(path, data, { contentType: mime, upsert: true });
    if (error) throw new Error(error.message);
    return path;
  }

  async downloadFile(path: string): Promise<Uint8Array | null> {
    const { data, error } = await (await this.getClient()).storage.from(this.config!.bucket).download(path);
    if (error) {
      if (error.message?.includes("404") || error.message?.includes("NotFound") || error.message?.includes("not found")) return null;
      throw new Error(error.message);
    }
    if (!data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }

  async deleteFile(path: string): Promise<void> {
    const { error } = await (await this.getClient()).storage.from(this.config!.bucket).remove([path]);
    if (error) throw new Error(error.message);
  }

  async listFiles(prefix: string): Promise<string[]> {
    const { data, error } = await (await this.getClient()).storage.from(this.config!.bucket).list(prefix, { limit: 1000 });
    if (error) throw new Error(error.message);
    return (data || []).map((f) => (f.id ? `${prefix}/${f.name}` : f.name));
  }

  getPublicUrl(path: string): string | null {
    if (!this.isConfigured()) return null;
    return `${this.config!.url}/storage/v1/object/public/${this.config!.bucket}/${path}`;
  }

  async getFileUrl(path: string, _mime: string): Promise<string> {
    const url = this.getPublicUrl(path);
    if (url) return url;
    const data = await this.downloadFile(path);
    if (!data) throw new Error("File not found: " + path);
    return URL.createObjectURL(new Blob([data], { type: _mime }));
  }

  async writeText(path: string, content: string): Promise<void> {
    const { error } = await (await this.getClient()).storage
      .from(this.config!.bucket)
      .upload(path, content, { contentType: "application/json; charset=utf-8", upsert: true });
    if (error) throw new Error(error.message);
  }

  async readText(path: string): Promise<string | null> {
    const data = await this.downloadFile(path);
    if (!data) return null;
    return new TextDecoder().decode(data);
  }
}
