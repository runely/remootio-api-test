import { Router, Request, Response } from 'express';

const router = Router();

router.get('/status', (req: Request, res: Response) => {
  console.log('status called');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.post('/close', (req: Request, res: Response) => {
  // ... eventuell "lukke-"-logikk
  console.log('close called');
  res.json({ result: 'closed' });
});

router.post('/open', (req: Request, res: Response) => {
  // ... eventuell "åpne-"-logikk
  console.log('open called');
  res.json({ result: 'opened' });
});

export default router;
