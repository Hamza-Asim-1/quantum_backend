import { Router } from 'express';
import { 
  healthCheck, 
  detailedHealthCheck, 
  readinessCheck, 
  livenessCheck 
} from '../controllers/healthController';

const router = Router();

// Basic health check
router.get('/', healthCheck);

// Detailed health check for monitoring
router.get('/detailed', detailedHealthCheck);

// Kubernetes/Render readiness probe
router.get('/ready', readinessCheck);

// Kubernetes/Render liveness probe
router.get('/live', livenessCheck);

export default router;
