import { Router, Request, Response } from 'express';
import { upload } from '../middleware/upload.middleware';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';
import { documentQueue } from '../config/queue';
import { DocumentType } from '@prisma/client';
import path from 'path';

const router = Router();

/**
 * POST /api/documents/upload
 * Upload a document
 */
router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const { companyId, companyName, companyTicker, documentType, filingDate, fiscalYear, fiscalQuarter } = req.body;

    // Validate required fields
    if (!documentType) {
      throw new AppError('documentType is required', 400);
    }

    // Get or create company
    let company;
    if (companyId) {
      company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) {
        throw new AppError('Company not found', 404);
      }
    } else if (companyTicker) {
      company = await prisma.company.findUnique({ where: { ticker: companyTicker } });
      if (!company && companyName) {
        company = await prisma.company.create({
          data: {
            name: companyName,
            ticker: companyTicker,
          },
        });
      } else if (!company) {
        throw new AppError('Company not found. Please provide companyName to create a new company.', 400);
      }
    } else {
      throw new AppError('Either companyId or companyTicker is required', 400);
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        filename: req.file.filename,
        originalFilename: req.file.originalname,
        fileUrl: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        companyId: company.id,
        documentType: documentType as DocumentType,
        filingDate: filingDate ? new Date(filingDate) : null,
        fiscalYear: fiscalYear ? parseInt(fiscalYear) : null,
        fiscalQuarter: fiscalQuarter ? parseInt(fiscalQuarter) : null,
      },
      include: {
        company: true,
      },
    });

    // Add to processing queue
    const job = await documentQueue.add({
      documentId: document.id,
    });

    res.status(202).json({
      status: 'success',
      message: 'Document uploaded and queued for processing',
      data: {
        documentId: document.id,
        filename: document.originalFilename,
        status: document.status,
        jobId: job.id,
        company: {
          id: company.id,
          name: company.name,
          ticker: company.ticker,
        },
      },
    });
  })
);

/**
 * GET /api/documents
 * List all documents
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId, status, documentType } = req.query;

    const documents = await prisma.document.findMany({
      where: {
        ...(companyId && { companyId: companyId as string }),
        ...(status && { status: status as any }),
        ...(documentType && { documentType: documentType as any }),
      },
      include: {
        company: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      status: 'success',
      data: documents,
    });
  })
);

/**
 * GET /api/documents/:id
 * Get document details
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        company: true,
        chunks: {
          select: {
            id: true,
            chunkIndex: true,
            tokenCount: true,
            pageNumber: true,
            section: true,
          },
        },
      },
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    res.json({
      status: 'success',
      data: document,
    });
  })
);

/**
 * GET /api/documents/:id/status
 * Get document processing status
 */
router.get(
  '/:id/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        chunksCount: true,
        processingError: true,
        processingStartedAt: true,
        processingCompletedAt: true,
      },
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    res.json({
      status: 'success',
      data: document,
    });
  })
);

/**
 * DELETE /api/documents/:id
 * Delete document
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Delete from database (cascades to chunks and citations)
    await prisma.document.delete({
      where: { id },
    });

    // Note: ChromaDB chunks will be deleted via the cascade in document.service
    // You might want to add explicit cleanup here

    res.json({
      status: 'success',
      message: 'Document deleted successfully',
    });
  })
);

export default router;
