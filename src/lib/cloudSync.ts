let cloudAvailableCache: boolean | null = null;

/** Whether the server has DATABASE_URL configured (cached after first fetch). */
export async function isCloudAvailable(): Promise<boolean> {
  if (cloudAvailableCache !== null) return cloudAvailableCache;
  try {
    const res = await fetch('/api/config');
    if (!res.ok) {
      cloudAvailableCache = false;
      return false;
    }
    const data = await res.json();
    cloudAvailableCache = Boolean(data.cloudAvailable);
    return cloudAvailableCache;
  } catch {
    cloudAvailableCache = false;
    return false;
  }
}

export function resetCloudAvailabilityCache() {
  cloudAvailableCache = null;
}

/** Cloud sync runs only when the server has a DB and the user opted in. */
export async function shouldSyncToCloud(cloudBackupEnabled: boolean): Promise<boolean> {
  if (!cloudBackupEnabled) return false;
  return isCloudAvailable();
}
