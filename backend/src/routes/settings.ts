import express from 'express';
import {
  getAllSettings,
  getSetting,
  updateSettings
} from '../controllers/settingsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All settings routes require authentication
router.use(authenticate);

// Settings routes
router.get('/', getAllSettings);
router.get('/:key', getSetting);
router.put('/', updateSettings);

export default router;

