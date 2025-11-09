import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';

const router = Router();

/**
 * GET /api/companies
 * List all companies
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      status: 'success',
      data: companies,
    });
  })
);

/**
 * GET /api/companies/:ticker
 * Get company by ticker with documents
 */
router.get(
  '/:ticker',
  asyncHandler(async (req: Request, res: Response) => {
    const { ticker } = req.params;

    const company = await prisma.company.findUnique({
      where: { ticker: ticker.toUpperCase() },
      include: {
        documents: {
          orderBy: {
            filingDate: 'desc',
          },
        },
      },
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    res.json({
      status: 'success',
      data: company,
    });
  })
);

/**
 * POST /api/companies
 * Create a new company
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, ticker, sector, industry, description } = req.body;

    if (!name || !ticker) {
      throw new AppError('name and ticker are required', 400);
    }

    const company = await prisma.company.create({
      data: {
        name,
        ticker: ticker.toUpperCase(),
        sector,
        industry,
        description,
      },
    });

    res.status(201).json({
      status: 'success',
      data: company,
    });
  })
);

export default router;
