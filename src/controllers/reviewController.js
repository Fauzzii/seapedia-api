import prisma from '../config/index.js';
import { handleError } from '../utils/errorHandler.js';
import { sanitizeText } from '../utils/sanitizer.js';

export const getReviews = async (req, res) => {
    try {
        const reviews = await prisma.review.findMany({
            orderBy: { created_at: 'desc' }
        });
        res.status(200).json(reviews);
    } catch (error) {
        handleError(res, error);
    }
};

export const createReview = async (req, res) => {
    try {
        const { rating, comment, reviewer_name } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ msg: "Rating wajib diisi antara 1-5" });
        }

        const sanitizedComment = comment ? sanitizeText(comment) : null;
        const sanitizedReviewerName = reviewer_name ? sanitizeText(reviewer_name) : null;

        const data = {
            rating: parseInt(rating),
            comment: sanitizedComment
        };

        if (req.session && req.session.userId) {
            data.user_id = BigInt(req.session.userId);
            if (!reviewer_name) {
                const user = await prisma.user.findUnique({
                    where: { id: data.user_id }
                });
                data.reviewer_name = user ? user.full_name : "User";
            } else {
                data.reviewer_name = sanitizedReviewerName;
            }
        } else {
            data.reviewer_name = sanitizedReviewerName || "Guest";
        }

        const newReview = await prisma.review.create({
            data
        });

        res.status(201).json({ msg: "Review berhasil dikirim", review: newReview });
    } catch (error) {
        handleError(res, error, 400);
    }
};
