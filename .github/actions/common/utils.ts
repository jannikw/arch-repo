import util from "util";
import child_process from "child_process";
import fs from "fs";

export const execFile = util.promisify(child_process.execFile);

export async function getDirSubdirs(path: string): Promise<string[]> {
  const entries = await fs.promises.readdir(path, { withFileTypes: true });

  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export async function getDirFiles(path: string): Promise<string[]> {
  const entries = await fs.promises.readdir(path, { withFileTypes: true });

  return entries.filter((e) => e.isFile()).map((e) => e.name);
}

export async function checkFileExists(path: string): Promise<boolean> {
  return await fs.promises
    .access(path, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

export async function tryUnlink(path: string) {
    try {
        await fs.promises.unlink(path);
        return true;
    } catch (err) {
        // if the file didn't exist before, this is not an issue
        if (err.code !== "ENOENT") {
            throw err;
        }
        return false;
    }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`${name} must be defined`);
  }
  return value;
}