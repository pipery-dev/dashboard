import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const CONFIG_DIR = path.join(os.homedir(), ".config", "pipery-cli");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

async function ensureConfigDir() {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
}

export async function loadConfig() {
  try {
    const content = await fs.readFile(CONFIG_FILE, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

export async function saveConfig(nextConfig) {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(nextConfig, null, 2));
}

export async function clearConfig() {
  try {
    await fs.unlink(CONFIG_FILE);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
