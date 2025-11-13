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
  );
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

