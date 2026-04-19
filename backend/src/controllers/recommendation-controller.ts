import type { Request, Response } from 'express';
import * as recommendationService from '../services/recommendation-service.js';

export async function getGroupRecommendations(req: Request, res: Response): Promise<void> {
  const { groupId } = req.params;
  const payload = await recommendationService.getRecommendationsForGroup(groupId);
  res.json(payload);
}
