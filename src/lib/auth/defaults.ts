/** Default UserSettings row for a new account. */
export function defaultUserSettings(name: string) {
  return {
    geminiApiKey: '',
    githubToken: '',
    githubUsername: '',
    cloudBackupEnabled: false,
    theme: 'midnight',
    accentColor: '#00F5FF',
    dashboardWidgets: JSON.stringify([
      'trading-equity',
      'active-projects',
      'todos',
      'productivity',
      'recent-activity',
      'integrations',
      'spotify',
    ]),
    name: name || '',
    avatar: '',
    propFirmAccountsCount: 1,
  };
}
