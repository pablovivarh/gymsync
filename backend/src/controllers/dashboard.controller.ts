import type { Request, Response } from 'express';
import { getOperationalSummary } from '../services/dashboard.service';

export async function getOperationalSummaryHandler(_req: Request, res: Response): Promise<void> {
  const summary = await getOperationalSummary();

  res.json({
    success: true,
    data: { summary },
  });
}
