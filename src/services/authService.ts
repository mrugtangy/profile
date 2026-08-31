const TOKEN_KEY = 'admin_auth_token';

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  async checkConfigStatus(): Promise<{ isConfigured: boolean; type?: string }> {
    const res = await fetch('/api/config/status');
    if (!res.ok) throw new Error('Failed to check configuration status');
    return res.json();
  },

  async isConfigured(): Promise<boolean> {
    try {
      const res = await this.checkConfigStatus();
      return res.isConfigured === true;
    } catch {
      return false;
    }
  },

  async testConfig(configData: any): Promise<{ success: boolean; message?: string }> {
    const res = await fetch('/api/config/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData),
    });
    return res.json();
  },

  async setupApp(payload: any): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
    const res = await fetch('/api/config/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Initial setup failed');
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async login(username: string, password: string): Promise<{ success: boolean; token: string; user: any }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async getCurrentUser(): Promise<{ id: string; username: string; enabled: boolean } | null> {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        this.removeToken();
        return null;
      }
      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  },

  async updateAccount(payload: { username?: string; newPassword?: string; confirmPassword?: string }): Promise<{ success: boolean; token?: string; user?: any }> {
    const res = await fetch('/api/auth/update-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update account');
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  // Admin Management API
  async fetchAdmins(): Promise<any[]> {
    const res = await fetch('/api/admin/users', {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to fetch administrators');
    }
    return res.json();
  },

  async createAdmin(adminData: { username: string; password: string; enabled?: boolean }): Promise<any> {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(adminData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create administrator');
    }
    return data;
  },

  async updateAdmin(id: string, updates: { username?: string; password?: string; enabled?: boolean }): Promise<any> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update administrator');
    }
    return data;
  },

  async deleteAdmin(id: string): Promise<void> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete administrator');
    }
  },

  // Database Config API
  async fetchDbConfig(): Promise<any> {
    const res = await fetch('/api/admin/db-config', {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to fetch database configuration');
    }
    return res.json();
  },

  async testDbConfig(configData: any): Promise<{ success: boolean; message?: string }> {
    const res = await fetch('/api/admin/db-config/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(configData),
    });
    return res.json();
  },

  async updateDbConfig(configData: any): Promise<{ success: boolean; message?: string }> {
    const res = await fetch('/api/admin/db-config/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(configData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update database configuration');
    }
    return data;
  },
};
