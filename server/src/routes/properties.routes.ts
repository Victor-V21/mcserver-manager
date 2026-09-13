import { Router, Request, Response } from 'express';
import { PropertiesService } from '../services/properties.service';

const router = Router();
const propertiesService = PropertiesService.getInstance();

// GET /api/properties
router.get('/', (_req: Request, res: Response) => {
  try {
    const result = propertiesService.getProperties();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to read server.properties' });
  }
});

// PUT /api/properties
router.put('/', (req: Request, res: Response) => {
  try {
    const { properties, raw } = req.body;
    propertiesService.saveProperties({ properties, raw });
    res.json({ success: true, message: 'Properties saved successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save server.properties' });
  }
});

export default router;
