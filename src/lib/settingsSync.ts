import type { UserSettings } from '@/lib/db';
import { serverDb } from '@/lib/serverDb';

/** Build a payload for server userSettings from local settings. */
export function toServerSettingsPayload(sObj: UserSettings, serverId?: number) {
  return {
    ...(serverId !== undefined ? { id: serverId } : {}),
    geminiApiKey: sObj.geminiApiKey || '',
    githubToken: sObj.githubToken || '',
    githubUsername: sObj.githubUsername || '',
    cloudBackupEnabled: !!sObj.cloudBackupEnabled,
    theme: sObj.theme || 'dark',
    accentColor: sObj.accentColor || '#00F5FF',
    dashboardWidgets: sObj.dashboardWidgets || [],
    name: sObj.name || '',
    avatar: sObj.avatar || '',
    propFirmAccountsCount: sObj.propFirmAccountsCount || 1,
    propFirmName: sObj.propFirmName || null,
    propFirmSize: sObj.propFirmSize || null,
    spotifyClientId: sObj.spotifyClientId || null,
    spotifyClientSecret: sObj.spotifyClientSecret || null,
    spotifyAccessToken: sObj.spotifyAccessToken || null,
    spotifyRefreshToken: sObj.spotifyRefreshToken || null,
    spotifyExpiresAt: sObj.spotifyExpiresAt ? Number(sObj.spotifyExpiresAt) : null,
    summerBreakMode: !!sObj.summerBreakMode,
    appleHealthEnabled: !!sObj.appleHealthEnabled,
  };
}

export async function resolveServerSettingsId(accountId?: number): Promise<number | undefined> {
  try {
    const serverSettings = await serverDb.settings.toArray();
    const row = accountId
      ? serverSettings.find((s: { accountId?: number; id?: number }) => s.accountId === accountId)
      : serverSettings[0];
    if (row?.id) return row.id;
  } catch {
    // Server may be unavailable
  }
  return undefined;
}
