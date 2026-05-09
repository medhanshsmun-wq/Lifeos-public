'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '@/lib/db';
import { GitBranch, Star, GitFork, Users, ExternalLink, AlertCircle } from 'lucide-react';
import { GitHubCalendar } from 'react-github-calendar';
import Link from 'next/link';

interface GithubRepo {
  id: number;
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
}

interface GithubUser {
  login: string;
  avatar_url: string;
  name: string;
  public_repos: number;
  total_private_repos?: number;
  followers: number;
  following: number;
  html_url: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function GithubPage() {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [profile, setProfile] = useState<GithubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const s = await db.settings.toArray();
      if (s[0]) {
        setUsername(s[0].githubUsername);
        setToken(s[0].githubToken);
      }
      setLoading(false);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (!username) return;

    const fetchGithubData = async () => {
      try {
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `token ${token}`;
        }

        // Fetch profile
        const profileUrl = token ? 'https://api.github.com/user' : `https://api.github.com/users/${username}`;
        const profileRes = await fetch(profileUrl, { headers });
        if (!profileRes.ok) throw new Error('Failed to fetch GitHub profile');
        const profileData = await profileRes.json();
        setProfile(profileData);

        // Fetch repos
        const reposUrl = token ? 'https://api.github.com/user/repos?sort=updated&per_page=6' : `https://api.github.com/users/${username}/repos?sort=updated&per_page=6`;
        const reposRes = await fetch(reposUrl, { headers });
        if (!reposRes.ok) throw new Error('Failed to fetch GitHub repositories');
        const reposData = await reposRes.json();
        setRepos(reposData);

      } catch (err: any) {
        setError(err.message || 'Failed to fetch GitHub data');
      }
    };

    fetchGithubData();
  }, [username, token]);

  if (loading) {
    return <div className="p-8 text-[var(--text-tertiary)]">Loading GitHub data...</div>;
  }

  if (!username) {
    return (
      <div className="p-6 lg:p-8 grid-bg min-h-full flex flex-col items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center mx-auto mb-4">
            <GitBranch className="w-8 h-8 text-[var(--text-primary)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">GitHub Not Connected</h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-6">
            Please configure your GitHub Username in Settings to view your coding analytics, repositories, and contribution graph.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--text-primary)] text-black text-sm font-semibold hover:bg-[var(--text-secondary)] transition-colors"
          >
            Go to Settings
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 grid-bg min-h-full">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {profile ? (
              <img src={profile.avatar_url} alt="GitHub Avatar" className="w-12 h-12 rounded-full border-2 border-[var(--border-subtle)]" />
            ) : (
              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.05)]">
                <GitBranch className="w-6 h-6 text-[var(--text-primary)]" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                {profile?.name || username}
                <span className="text-sm font-normal text-[var(--text-tertiary)]">@{username}</span>
              </h1>
              <p className="text-xs text-[var(--text-tertiary)] font-mono flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {profile?.followers || 0} followers</span>
                <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" /> {(profile?.public_repos || 0) + (profile?.total_private_repos || 0)} repos</span>
              </p>
            </div>
          </div>
          {profile && (
            <a
              href={profile.html_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-glass)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glow)] transition-all text-sm font-medium"
            >
              View on GitHub <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </motion.div>

        {error && (
          <motion.div variants={item} className="p-4 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-red-400">Error fetching GitHub data</h3>
              <p className="text-xs text-red-400/80 mt-1">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Contributions Calendar */}
        <motion.div variants={item} className="glass-card p-6 overflow-x-auto">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[var(--accent-green)]" />
            Contribution Graph
          </h3>
          <div className="min-w-[800px] text-xs">
            <GitHubCalendar
              username={username}
              colorScheme="dark"
              theme={{
                light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
                dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
              }}
              style={{ width: '100%' }}
            />
          </div>
        </motion.div>

        {/* Recent Repositories */}
        <motion.div variants={item} className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Star className="w-4 h-4 text-[var(--accent-yellow)]" />
            Recently Updated Repositories
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repos.map(repo => (
              <a
                key={repo.id}
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="glass-card p-5 hover:border-[var(--border-glow)] transition-all shine-hover group block"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-bold text-[var(--accent-blue)] group-hover:text-[var(--accent-cyan)] transition-colors truncate pr-2">
                    {repo.name}
                  </h4>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 border border-[var(--border-subtle)] px-2 py-0.5 rounded-full">
                    {repo.language || 'Unknown'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 min-h-[32px]">
                  {repo.description || 'No description provided.'}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-[var(--text-tertiary)]">
                  <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> {repo.stargazers_count}</span>
                  <span className="flex items-center gap-1.5"><GitFork className="w-3.5 h-3.5" /> {repo.forks_count}</span>
                </div>
              </a>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
