# LifeOS Integrations Setup Guide

Welcome to the LifeOS Integrations Setup Guide. Follow the steps below to connect external services to your LifeOS dashboard.

## Spotify
1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
2. Log in and create an App.
3. In the App settings, set the Redirect URI to `http://127.0.0.1:3000/api/auth/callback/spotify`.
4. Copy the **Client ID** and **Client Secret**.
5. Open LifeOS, go to **Settings** and paste the Client ID and Secret in the corresponding fields.
6. Go to **Integrations** and click "Connect" on the Spotify card.

## GitHub
1. Go to your GitHub account settings.
2. Navigate to **Developer settings** -> **Personal access tokens** -> **Tokens (classic)**.
3. Generate a new token with `repo` and `read:user` scopes.
4. Copy the token.
5. Open LifeOS, go to **Settings**, and paste your GitHub username and the generated token.

## Apple Health
1. In the **Integrations** page of LifeOS, toggle the Apple Health connection to **Connected**.
2. Download the Apple Shortcuts app on your iPhone.
3. Create a shortcut that extracts steps, distance, and active minutes from the Health app.
4. Configure the shortcut to send a POST request to your LifeOS `/api/health-sync` endpoint with a JSON body containing your daily metrics.
5. Set up a daily automation in Shortcuts to run at 11:59 PM.

## Google Calendar & Notion (Coming Soon)
These integrations are currently under development. Stay tuned for future updates!
