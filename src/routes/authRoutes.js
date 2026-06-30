import express from "express";
import { login, logout, getMe, selectRole } from "../controllers/authController.js";
import { createUser } from "../controllers/userController.js";
import { verifyUser } from "../middleware/AuthUser.js";
import { 
    validateLogin, 
    validateRegister 
} from "../validators/userValidator.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post('/register', validateRegister, createUser);
router.post('/login', authLimiter, validateLogin, login);
router.delete('/logout', verifyUser, logout);
router.get('/me', verifyUser, getMe);
router.post('/select-role', verifyUser, selectRole);


export default router;
