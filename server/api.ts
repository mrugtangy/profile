import express, { Request, Response } from 'express';
import { loadDbConfig, saveDbConfig, getDbAdapter, testDbConfigConnection, initializeDbWithAdmin, createAdapterForConfig } from './db/index.js';
import { hashPassword, comparePassword, generateToken, requireAuth, AuthenticatedRequest } from './auth.js';
import { DbConfig } from './db/types.js';

const router = express.Router();

// 1. Config Status
router.get('/config/status', async (req: Request, res: Response) => {
  try {
    const config = await loadDbConfig();
    res.json({
      isConfigured: Boolean(config.isConfigured),
      type: config.type || 'sqlite',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch config status' });
  }
});

// 2. Test Connection (Unauthenticated for setup screen)
router.post('/config/test', async (req: Request, res: Response) => {
  try {
    const { type, mongodb, mysql, sqlite } = req.body;
    const testConfig: DbConfig = {
      isConfigured: false,
      type: type || 'sqlite',
      mongodb,
      mysql,
      sqlite,
    };
    const result = await testDbConfigConnection(testConfig);
    res.json(result);
  } catch (err: any) {
    res.json({ success: false, message: err.message || 'Connection test failed' });
  }
});

// 3. Initial Setup
router.post('/config/setup', async (req: Request, res: Response) => {
  try {
    const currentConfig = await loadDbConfig();
    if (currentConfig.isConfigured) {
      return res.status(403).json({ error: 'Initial setup is already completed and locked.' });
    }

    const { setupUsername, setupPassword, dbConfig, adminUsername, adminPassword, confirmPassword } = req.body;

    // Validate temporary setup credentials
    if (setupUsername !== 'admin' || setupPassword !== 'admin') {
      return res.status(401).json({ error: 'Invalid setup credentials. Temporary credentials are admin / admin.' });
    }

    if (!adminUsername || typeof adminUsername !== 'string' || adminUsername.trim().length === 0) {
      return res.status(400).json({ error: 'Administrator username is required.' });
    }

    if (!adminPassword || typeof adminPassword !== 'string' || adminPassword.length < 4) {
      return res.status(400).json({ error: 'Administrator password must be at least 4 characters.' });
    }

    if (adminPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Administrator passwords do not match.' });
    }

    const passwordHash = await hashPassword(adminPassword);

    const initRes = await initializeDbWithAdmin(dbConfig, {
      username: adminUsername.trim(),
      passwordHash,
    });

    if (!initRes.success) {
      return res.status(400).json({ error: initRes.message || 'Failed to initialize database.' });
    }

    const token = generateToken({ id: initRes.admin.id, username: initRes.admin.username });

    res.json({
      success: true,
      token,
      user: {
        id: initRes.admin.id,
        username: initRes.admin.username,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error during initial setup.' });
  }
});

// 4. Login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const config = await loadDbConfig();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (!config.isConfigured) {
      return res.status(400).json({
        error: 'Application is not configured yet. Please complete setup at /config.',
      });
    }

    // Default admin/admin should NOT work if app is configured
    const db = await getDbAdapter();
    const admin = await db.getAdminByUsername(username);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (!admin.enabled) {
      return res.status(403).json({ error: 'This administrator account is disabled.' });
    }

    const match = await comparePassword(password, admin.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = generateToken({ id: admin.id, username: admin.username });
    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        username: admin.username,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// 5. Current User Info
router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: {
      id: req.user!.id,
      username: req.user!.username,
      enabled: req.user!.enabled,
    },
  });
});

// 6. Update Own Account Settings
router.post('/auth/update-account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, newPassword, confirmPassword } = req.body;
    const db = await getDbAdapter();
    const currentAdmin = req.user!;

    const updates: any = {};

    if (username && username.trim() !== '' && username.trim() !== currentAdmin.username) {
      const existing = await db.getAdminByUsername(username.trim());
      if (existing && existing.id !== currentAdmin.id) {
        return res.status(400).json({ error: 'Username is already taken by another administrator.' });
      }
      updates.username = username.trim();
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New passwords do not match.' });
      }
      updates.passwordHash = await hashPassword(newPassword);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No changes provided.' });
    }

    const updated = await db.updateAdmin(currentAdmin.id, updates);
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update account.' });
    }

    const token = generateToken({ id: updated.id, username: updated.username });

    res.json({
      success: true,
      token,
      user: {
        id: updated.id,
        username: updated.username,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update account.' });
  }
});

// 7. Administrator Management Routes
router.get('/admin/users', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDbAdapter();
    const admins = await db.getAdmins();
    const safeAdmins = admins.map(({ passwordHash, ...rest }) => rest);
    res.json(safeAdmins);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch administrators.' });
  }
});

router.post('/admin/users', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password, enabled } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const db = await getDbAdapter();
    const existing = await db.getAdminByUsername(username.trim());
    if (existing) {
      return res.status(400).json({ error: 'An administrator with this username already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const created = await db.createAdmin({
      username: username.trim(),
      passwordHash,
      enabled: enabled !== false,
    });

    const { passwordHash: _, ...safeAdmin } = created;
    res.json(safeAdmin);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create administrator.' });
  }
});

router.put('/admin/users/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { username, password, enabled } = req.body;
    const db = await getDbAdapter();

    const targetAdmin = await db.getAdminById(id);
    if (!targetAdmin) {
      return res.status(404).json({ error: 'Administrator not found.' });
    }

    const updates: any = {};

    if (username && username.trim() !== '' && username.trim() !== targetAdmin.username) {
      const existing = await db.getAdminByUsername(username.trim());
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }
      updates.username = username.trim();
    }

    if (password) {
      if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
      }
      updates.passwordHash = await hashPassword(password);
    }

    if (enabled !== undefined) {
      // Safeguard: Check if disabling would leave zero active admins
      if (enabled === false) {
        const allAdmins = await db.getAdmins();
        const activeAdmins = allAdmins.filter((a) => a.enabled && a.id !== id);
        if (activeAdmins.length === 0) {
          return res.status(400).json({ error: 'Cannot disable the only active administrator account.' });
        }
      }
      updates.enabled = Boolean(enabled);
    }

    const updated = await db.updateAdmin(id, updates);
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update administrator.' });
    }

    const { passwordHash: _, ...safeAdmin } = updated;
    res.json(safeAdmin);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update administrator.' });
  }
});

router.delete('/admin/users/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDbAdapter();

    const targetAdmin = await db.getAdminById(id);
    if (!targetAdmin) {
      return res.status(404).json({ error: 'Administrator not found.' });
    }

    // Safeguard: Check if deleting would leave zero active admins
    const allAdmins = await db.getAdmins();
    const activeAdmins = allAdmins.filter((a) => a.enabled && a.id !== id);
    if (activeAdmins.length === 0) {
      return res.status(400).json({ error: 'Cannot delete the only remaining active administrator.' });
    }

    await db.deleteAdmin(id);
    res.json({ success: true, message: 'Administrator removed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete administrator.' });
  }
});

// 8. Database Configuration Management Routes
router.get('/admin/db-config', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = await loadDbConfig();

    // Mask passwords for safety
    const safeConfig: any = { ...config };
    if (safeConfig.mysql && safeConfig.mysql.password) {
      safeConfig.mysql = { ...safeConfig.mysql, password: '••••••••' };
    }

    res.json(safeConfig);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch database configuration.' });
  }
});

router.post('/admin/db-config/test', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, mongodb, mysql, sqlite } = req.body;
    const testConfig: DbConfig = {
      isConfigured: true,
      type: type || 'sqlite',
      mongodb,
      mysql,
      sqlite,
    };
    const result = await testDbConfigConnection(testConfig);
    res.json(result);
  } catch (err: any) {
    res.json({ success: false, message: err.message || 'Connection test failed.' });
  }
});

router.post('/admin/db-config/update', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, mongodb, mysql, sqlite } = req.body;
    const currentConfig = await loadDbConfig();

    // Preserve existing password if user passed masked password '••••••••'
    let finalMysql = mysql;
    if (mysql && mysql.password === '••••••••' && currentConfig.mysql?.password) {
      finalMysql = { ...mysql, password: currentConfig.mysql.password };
    }

    const newConfig: DbConfig = {
      isConfigured: true,
      type: type || 'sqlite',
      mongodb,
      mysql: finalMysql,
      sqlite,
    };

    // 1. Test connection first
    const testRes = await testDbConfigConnection(newConfig);
    if (!testRes.success) {
      return res.status(400).json({ error: testRes.message || 'Target database connection failed.' });
    }

    // 2. Initialize schema on new adapter
    const newAdapter = createAdapterForConfig(newConfig);
    await newAdapter.initializeSchema();

    // 3. Ensure admins exist in new adapter (Copy current admins over)
    const currentDb = await getDbAdapter();
    const existingAdmins = await currentDb.getAdmins();

    const newDbAdmins = await newAdapter.getAdmins();
    if (newDbAdmins.length === 0 && existingAdmins.length > 0) {
      for (const admin of existingAdmins) {
        try {
          await newAdapter.createAdmin({
            username: admin.username,
            passwordHash: admin.passwordHash,
            enabled: admin.enabled,
          });
        } catch {}
      }
    }

    // 4. Save new config
    await saveDbConfig(newConfig);

    res.json({ success: true, message: 'Database configuration updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update database configuration.' });
  }
});

// 9. Application Settings and Messages Endpoints (Database-backed)
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const db = await getDbAdapter();
    const settings = await db.getSettings();
    res.json(settings || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch settings.' });
  }
});

router.post('/settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDbAdapter();
    await db.saveSettings(req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save settings.' });
  }
});

router.get('/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDbAdapter();
    const messages = await db.getMessages();
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch messages.' });
  }
});

router.post('/messages', async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All message fields are required.' });
    }
    const db = await getDbAdapter();
    const created = await db.addMessage({ name, email, subject, message });
    res.json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send message.' });
  }
});

router.put('/messages/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { read } = req.body;
    const db = await getDbAdapter();
    await db.updateMessage(id, { read: Boolean(read) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update message.' });
  }
});

router.delete('/messages/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDbAdapter();
    await db.deleteMessage(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete message.' });
  }
});

export default router;
