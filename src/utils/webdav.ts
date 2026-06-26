import type { WebDavConfig } from "../types";

/**
 * Uploads a text file content (like JSON string) to a WebDav server.
 */
export async function webdavUpload(config: WebDavConfig, filename: string, content: string): Promise<void> {
  if (!config.url || !config.username) {
    throw new Error("WebDav sync parameters are incomplete.");
  }
  
  // Format target URL
  const baseUrl = config.url.endsWith("/") ? config.url : `${config.url}/`;
  const targetUrl = `${baseUrl}${filename}`;
  
  // Create Basic Authentication token
  const token = btoa(`${config.username}:${config.password || ""}`);
  
  const response = await fetch(targetUrl, {
    method: "PUT",
    headers: {
      "Authorization": `Basic ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: content,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Downloads text file content from a WebDav server.
 */
export async function webdavDownload(config: WebDavConfig, filename: string): Promise<string> {
  if (!config.url || !config.username) {
    throw new Error("WebDav sync parameters are incomplete.");
  }
  
  const baseUrl = config.url.endsWith("/") ? config.url : `${config.url}/`;
  const targetUrl = `${baseUrl}${filename}`;
  
  const token = btoa(`${config.username}:${config.password || ""}`);
  
  const response = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "Authorization": `Basic ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Backup file not found on server.");
    }
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}
