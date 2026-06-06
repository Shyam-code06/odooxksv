import express from 'express';
import AuthController from './AuthController.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const router = express.Router();
const authController = new AuthController();

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.post('/changepassword', authMiddleware, authController.changePassword);

export default router;
