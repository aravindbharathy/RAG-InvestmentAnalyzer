import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { processQuery, getQueryHistory, getQueryResult } from '../services/query.service';

const router = Router();

/**
 * POST /api/query
 * Submit a query
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { queryText, companyFilter, documentTypes, limit } = req.body;

    if (!queryText || queryText.trim().length === 0) {
      throw new AppError('queryText is required', 400);
    }

    const result = await processQuery({
      queryText,
      companyFilter,
      documentTypes,
      limit,
    });

    res.json({
      status: 'success',
      data: result,
    });
  })
);

/**
 * GET /api/queries
 * Get query history
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const queries = await getQueryHistory(limit);

    res.json({
      status: 'success',
      data: queries,
    });
  })
);

/**
 * GET /api/queries/:id
 * Get specific query result
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const query = await getQueryResult(id);

    res.json({
      status: 'success',
      data: query,
    });
  })
);

export default router;
