import express from 'express';
import { getAddresses, createAddress, updateAddress, deleteAddress } from '../controllers/addressController.js';
import { verifyUser, requireActiveRole } from '../middleware/AuthUser.js';
import { validateAddress } from '../middleware/validators/addressValidator.js';

const router = express.Router();

router.use(verifyUser);
router.use(requireActiveRole('BUYER'));

router.get('/', getAddresses);
router.post('/', validateAddress, createAddress);
router.put('/:id', validateAddress, updateAddress);
router.delete('/:id', deleteAddress);

export default router;
