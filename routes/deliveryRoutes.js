import express from 'express';
import { 
    getAvailableJobs, 
    takeJob, 
    completeJob, 
    getJobById, 
    getDriverHistory, 
    getDriverEarnings 
} from '../controllers/deliveryController.js';
import { verifyUser, requireActiveRole } from '../middleware/AuthUser.js';

const router = express.Router();

router.use(verifyUser);
router.use(requireActiveRole('DRIVER'));

router.get('/jobs', getAvailableJobs);
router.get('/jobs/history', getDriverHistory);
router.get('/earnings', getDriverEarnings);
router.get('/jobs/:id', getJobById);
router.post('/jobs/:id/take', takeJob);
router.post('/jobs/:id/complete', completeJob);

export default router;
