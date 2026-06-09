import { Request, Response } from "express";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execAsync = promisify(exec);

// Path to status and update files
const REPO_DIR = path.resolve(process.cwd(), "../.."); // Assumes running from apps/api
const STATUS_FILE = path.join(REPO_DIR, "update-status.json");
const SCRIPT_FILE = path.join(REPO_DIR, "infra/scripts/self-update.sh");

async function checkGitUpdate() {
  try {
    // 1. Fetch remote changes
    await execAsync("git fetch", { cwd: REPO_DIR });
    
    // 2. Get current branch
    const { stdout: branchOut } = await execAsync("git rev-parse --abbrev-ref HEAD", { cwd: REPO_DIR });
    const branch = branchOut.trim();
    
    // 3. Get local hash
    const { stdout: localOut } = await execAsync("git rev-parse HEAD", { cwd: REPO_DIR });
    const localHash = localOut.trim();
    
    // 4. Get remote hash
    const { stdout: remoteOut } = await execAsync(`git rev-parse origin/${branch}`, { cwd: REPO_DIR });
    const remoteHash = remoteOut.trim();
    
    return {
      updateAvailable: localHash !== remoteHash,
      currentCommit: localHash.substring(0, 7),
      latestCommit: remoteHash.substring(0, 7),
      branch
    };
  } catch (error: any) {
    console.error("Git check failed:", error);
    return {
      updateAvailable: false,
      error: error.message || "Failed to check Git status"
    };
  }
}

export const getUpdateStatusHandler = async (_req: Request, res: Response) => {
  try {
    const gitInfo = await checkGitUpdate();
    
    // Check if status file exists
    let processStatus = null;
    try {
      const content = await fs.readFile(STATUS_FILE, "utf-8");
      processStatus = JSON.parse(content);
    } catch {
      // Doesn't exist or is invalid
    }
    
    return res.status(200).json({
      success: true,
      data: {
        git: gitInfo,
        process: processStatus
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to query update status" }
    });
  }
};

export const runUpdateHandler = async (_req: Request, res: Response) => {
  try {
    // Check if script file exists and is executable
    try {
      await fs.access(SCRIPT_FILE);
      await fs.chmod(SCRIPT_FILE, 0o755); // Ensure it is executable
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: { message: "Update script not found or not accessible on the server." }
      });
    }

    // Launch update script in the background (detached)
    const child = spawn("bash", [SCRIPT_FILE], {
      cwd: REPO_DIR,
      detached: true,
      stdio: "ignore"
    });
    
    child.unref();

    return res.status(200).json({
      success: true,
      data: {
        message: "Update process started in the background."
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to trigger update" }
    });
  }
};
