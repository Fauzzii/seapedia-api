import express from "express";
import { getUsers, getUserById, createUser, updateUser, deleteUser, getDashboardSummary } from "../controllers/userController.js";
import { verifyUser, adminOnly } from "../middleware/AuthUser.js";
import { validateRegister, validateUpdateUser } from "../validators/userValidator.js";

const router = express.Router();

router.get('/me/dashboard-summary', verifyUser, getDashboardSummary);
router.get('/', verifyUser, adminOnly, getUsers);
router.get('/:id', verifyUser, getUserById);
router.post('/', validateRegister, createUser);
router.patch('/:id', verifyUser, validateUpdateUser, updateUser);
router.delete('/:id', verifyUser, adminOnly, deleteUser);

export default router;