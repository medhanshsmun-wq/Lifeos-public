/**
 * Server DB Bridge
 * This utility provides a Dexie-like API that talks to the server-side Prisma backend.
 * Use this to migrate from browser-based storage to a proper database.
 */

async function apiRequest(model: string, method: string, data?: any, id?: number) {
  const url = `/api/db/${model}${id ? `?id=${id}` : ''}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (data) options.body = JSON.stringify(data);

  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `API Request failed: ${res.status}`);
  }
  return res.json();
}

class TableBridge {
  constructor(private modelName: string) {}

  async toArray() {
    return apiRequest(this.modelName, 'GET');
  }

  async get(id: number) {
    return apiRequest(this.modelName, 'GET', undefined, id);
  }

  async add(data: any) {
    return apiRequest(this.modelName, 'POST', data);
  }

  async put(data: any) {
    // If it has an id, use PUT, otherwise POST
    if (data.id) {
      return apiRequest(this.modelName, 'PUT', data);
    }
    return apiRequest(this.modelName, 'POST', data);
  }

  async update(id: number, data: any) {
    return apiRequest(this.modelName, 'PUT', { id, ...data });
  }

  async delete(id: number) {
    return apiRequest(this.modelName, 'DELETE', undefined, id);
  }

  async count() {
    const data = await this.toArray();
    return data.length;
  }

  // Helper for queries that Dexie supports
  orderBy(field: string) {
    return {
      reverse: () => ({
        toArray: async () => {
          const data = await this.toArray();
          return data.sort((a: any, b: any) => {
            if (a[field] < b[field]) return 1;
            if (a[field] > b[field]) return -1;
            return 0;
          });
        },
        limit: (n: number) => ({
          toArray: async () => {
            const data = await this.toArray();
            return data.sort((a: any, b: any) => {
              if (a[field] < b[field]) return 1;
              if (a[field] > b[field]) return -1;
              return 0;
            }).slice(0, n);
          }
        })
      })
    };
  }
}

export const serverDb = {
  projects: new TableBridge('project'),
  finance: new TableBridge('financeEntry'),
  fitness: new TableBridge('fitnessEntry'),
  diet: new TableBridge('dietEntry'),
  gym: new TableBridge('gymEntry'),
  hobbies: new TableBridge('hobbyEntry'),
  study: new TableBridge('studySession'),
  subjects: new TableBridge('subject'),
  studyAssignments: new TableBridge('studyAssignment'),
  habits: new TableBridge('habitEntry'),
  conversations: new TableBridge('aIConversation'),
  weeklyReports: new TableBridge('weeklyReport'),
  timeline: new TableBridge('timelineEvent'),
  settings: new TableBridge('userSettings'),
  trades: new TableBridge('trade'),
};
