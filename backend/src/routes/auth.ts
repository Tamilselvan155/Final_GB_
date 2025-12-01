import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', authController.login);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.get('/users', authenticate, authController.getUsers);
router.post('/users', authenticate, authController.createUser);
router.put('/users/:id', authenticate, authController.updateUser);
router.delete('/users/:id', authenticate, authController.deleteUser);
router.post('/users/:id/change-password', authenticate, authController.changePassword);

export default router;

