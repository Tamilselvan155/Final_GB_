import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Database } from '../database/connection.js';

interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

// Generate JWT token
const generateToken = (user: { id: number; username: string; email: string; role: string }): string => {
  const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    jwtSecret,
    { expiresIn }
  ) as string;
};

// Login controller
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
      return;
    }

    // Get user from database
    const db = Database.getDatabase();
    const user = db.prepare(`
      SELECT id, username, email, password_hash, role, full_name, status
      FROM users
      WHERE (username = ? OR email = ?) AND status = 'active'
    `).get(username, username) as {
      id: number;
      username: string;
      email: string;
      password_hash: string;
      role: string;
      full_name: string;
      status: string;
    } | undefined;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    // Update last login
    db.prepare(`
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(user.id);

    // Generate token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    // Send response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.full_name,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Logout controller (client-side token removal, but we can log it)
export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can log the logout action or add to a blacklist if needed
    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

// Get current user (verify token)
export const getCurrentUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const db = Database.getDatabase();
    const user = db.prepare(`
      SELECT id, username, email, role, full_name, status, last_login, created_at
      FROM users
      WHERE id = ? AND status = 'active'
    `).get(req.user.id) as {
      id: number;
      username: string;
      email: string;
      role: string;
      full_name: string;
      status: string;
      last_login: string | null;
      created_at: string;
    } | undefined;

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        lastLogin: user.last_login,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all users (admin only)
export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'superadmin' && req.user.role !== 'admin')) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Superadmin role required.',
      });
      return;
    }

    const db = Database.getDatabase();
    const users = db.prepare(`
      SELECT id, username, email, role, full_name, status, last_login, created_at
      FROM users
      ORDER BY created_at DESC
    `).all() as Array<{
      id: number;
      username: string;
      email: string;
      role: string;
      full_name: string;
      status: string;
      last_login: string | null;
      created_at: string;
    }>;

    res.json({
      success: true,
      data: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        status: user.status,
        lastLogin: user.last_login,
        createdAt: user.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// Create user (admin only)
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'superadmin' && req.user.role !== 'admin')) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Superadmin role required.',
      });
      return;
    }

    const { username, email, password, role, fullName } = req.body;

    // Validate input
    if (!username || !email || !password || !role || !fullName) {
      res.status(400).json({
        success: false,
        message: 'Username, email, password, role, and full name are required',
      });
      return;
    }

    // Validate role
    if (!['superadmin', 'admin', 'finance_manager'].includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid role. Must be superadmin, admin, or finance_manager',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
      return;
    }

    const db = Database.getDatabase();

    // Check if username or email already exists
    const existingUser = db.prepare(`
      SELECT id FROM users WHERE username = ? OR email = ?
    `).get(username, email) as { id: number } | undefined;

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Username or email already exists',
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if created_by column exists in the users table
    const tableInfo = db.prepare(`
      PRAGMA table_info(users)
    `).all() as Array<{ name: string }>;
    
    const hasCreatedByColumn = tableInfo.some(col => col.name === 'created_by');

    // Create user - conditionally include created_by if column exists
    let result;
    if (hasCreatedByColumn) {
      result = db.prepare(`
        INSERT INTO users (username, email, password_hash, role, full_name, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(username, email, passwordHash, role, fullName, req.user.id);
    } else {
      // Fallback if created_by column doesn't exist
      result = db.prepare(`
        INSERT INTO users (username, email, password_hash, role, full_name)
        VALUES (?, ?, ?, ?, ?)
      `).run(username, email, passwordHash, role, fullName);
    }

    // Get created user
    const newUser = db.prepare(`
      SELECT id, username, email, role, full_name, status, created_at
      FROM users
      WHERE id = ?
    `).get(result.lastInsertRowid) as {
      id: number;
      username: string;
      email: string;
      role: string;
      full_name: string;
      status: string;
      created_at: string;
    };

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.full_name,
        status: newUser.status,
        createdAt: newUser.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update user (admin only)
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'superadmin' && req.user.role !== 'admin')) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Superadmin role required.',
      });
      return;
    }

    const { id } = req.params;
    const { username, email, role, fullName, status } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    const db = Database.getDatabase();

    // Check if user exists
    const existingUser = db.prepare(`
      SELECT id, username, email, role FROM users WHERE id = ?
    `).get(parseInt(id)) as { id: number; username: string; email: string; role: string } | undefined;

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Prevent Admin from updating Superadmin users
    if (req.user.role === 'admin' && existingUser.role === 'superadmin') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Only Superadmin can edit Superadmin users.',
      });
      return;
    }

    // Validate role if provided
    if (role && !['superadmin', 'admin', 'finance_manager'].includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid role. Must be superadmin, admin, or finance_manager',
      });
      return;
    }

    // Validate status if provided
    if (status && !['active', 'inactive', 'suspended'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, or suspended',
      });
      return;
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
        return;
      }
    }

    // Check if username or email already exists (excluding current user)
    if (username || email) {
      const duplicateUser = db.prepare(`
        SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?
      `).get(
        username || existingUser.username,
        email || existingUser.email,
        parseInt(id)
      ) as { id: number } | undefined;

      if (duplicateUser) {
        res.status(400).json({
          success: false,
          message: 'Username or email already exists',
        });
        return;
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role) {
      // Prevent Superadmin from changing their own role
      if (parseInt(id) === req.user.id && existingUser.role === 'superadmin' && role !== 'superadmin') {
        res.status(400).json({
          success: false,
          message: 'Superadmin cannot change their own role',
        });
        return;
      }
      updates.push('role = ?');
      values.push(role);
    }
    if (fullName) {
      updates.push('full_name = ?');
      values.push(fullName);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
      return;
    }

    values.push(parseInt(id));

    // Update user
    db.prepare(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    // Get updated user
    const updatedUser = db.prepare(`
      SELECT id, username, email, role, full_name, status, last_login, created_at
      FROM users
      WHERE id = ?
    `).get(parseInt(id)) as {
      id: number;
      username: string;
      email: string;
      role: string;
      full_name: string;
      status: string;
      last_login: string | null;
      created_at: string;
    };

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        fullName: updatedUser.full_name,
        status: updatedUser.status,
        lastLogin: updatedUser.last_login,
        createdAt: updatedUser.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete user (admin only)
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'superadmin' && req.user.role !== 'admin')) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Superadmin role required.',
      });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    const userId = parseInt(id);

    // Prevent self-deletion
    if (userId === req.user.id) {
      res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
      return;
    }

    const db = Database.getDatabase();

    // Check if user exists
    const user = db.prepare(`
      SELECT id, username, role FROM users WHERE id = ?
    `).get(userId) as { id: number; username: string; role: string } | undefined;

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Prevent Admin from deleting Superadmin users
    if (req.user.role === 'admin' && user.role === 'superadmin') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Only Superadmin can delete Superadmin users.',
      });
      return;
    }

    // Delete user
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Change password (admin can change any user's password, user can change their own)
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;
    const { newPassword, currentPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({
        success: false,
        message: 'New password is required',
      });
      return;
    }

    // Validate password strength
    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
      return;
    }

    const db = Database.getDatabase();
    const targetUserId = id ? parseInt(id) : req.user.id;

    // Check if user exists
    const user = db.prepare(`
      SELECT id, password_hash, role FROM users WHERE id = ?
    `).get(targetUserId) as {
      id: number;
      password_hash: string;
      role: string;
    } | undefined;

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Prevent Admin from changing Superadmin passwords
    if (req.user.role === 'admin' && user.role === 'superadmin' && targetUserId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Only Superadmin can change Superadmin passwords.',
      });
      return;
    }

    // If changing own password, require current password
    // If admin changing other user's password, no current password needed
    if (targetUserId === req.user.id) {
      if (!currentPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password is required',
        });
        return;
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isPasswordValid) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
        return;
      }
    } else {
      // Admin changing another user's password
      if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin or Superadmin role required.',
        });
        return;
      }
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    db.prepare(`
      UPDATE users
      SET password_hash = ?
      WHERE id = ?
    `).run(passwordHash, targetUserId);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

