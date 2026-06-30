import express from 'express';
import { getWallet, getWalletTransactions, topupWallet } from '../controllers/walletController.js';
import { verifyUser } from '../middleware/AuthUser.js';
import { validateTopup } from '../validators/walletValidator.js';

const router = express.Router();

router.use(verifyUser);

router.get('/wallet', getWallet);
router.get('/wallet/transactions', getWalletTransactions);
router.post('/wallet/topup', validateTopup, topupWallet);

export default router;
