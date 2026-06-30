import prisma from '../config/index.js';
import { handleError } from '../utils/errorHandler.js';
import { sanitizeText } from '../utils/sanitizer.js';

export const getProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
        const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
        const minRating = req.query.minRating ? parseFloat(req.query.minRating) : null;
        const sortBy = req.query.sortBy || 'newest';

        // Build where clause
        const where = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { store: { store_name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        if (category) {
            where.category = { equals: category, mode: 'insensitive' };
        }

        if (minPrice !== null) {
            where.price = { ...where.price, gte: minPrice };
        }

        if (maxPrice !== null) {
            where.price = { ...where.price, lte: maxPrice };
        }

        // Build orderBy
        let orderBy = { created_at: 'desc' };
        if (sortBy === 'price_asc') orderBy = { price: 'asc' };
        else if (sortBy === 'price_desc') orderBy = { price: 'desc' };

        const skip = (page - 1) * limit;

        // Fetch all matching products (minRating filter applied in-memory since Prisma can't aggregate-WHERE)
        const allProducts = await prisma.product.findMany({
            where,
            orderBy,
            include: {
                images: true,
                store: true,
                reviews: { select: { rating: true } }
            }
        });

        // Map ratings
        let mapped = allProducts.map(p => {
            const ratings = p.reviews.map(r => r.rating);
            const avgRating = ratings.length > 0
                ? parseFloat((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1))
                : 0;
            return { ...p, rating: avgRating, reviewCount: ratings.length };
        });

        // Apply minRating filter in-memory
        if (minRating !== null && minRating > 0) {
            mapped = mapped.filter(p => p.rating >= minRating);
        }

        const filteredTotal = mapped.length;
        const paged = mapped.slice(skip, skip + limit);

        return res.status(200).json({
            products: paged,
            total: filteredTotal,
            pages: Math.ceil(filteredTotal / limit),
            currentPage: page
        });
    } catch (error) {
        handleError(res, error);
    }
};

export const getProductById = async (req, res) => {
    try {
        const productId = BigInt(req.params.id);
        const response = await prisma.product.findUnique({
            where: { id: productId },
            include: { 
                images: true, 
                store: true,
                reviews: {
                    select: {
                        rating: true
                    }
                }
            }
        });
        if (!response) return res.status(404).json({ msg: "Produk tidak ditemukan" });
        
        const ratings = response.reviews.map(r => r.rating);
        const avgRating = ratings.length > 0 ? parseFloat((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)) : 0;

        let canReview = false;
        if (req.session && req.session.userId) {
            const buyerId = BigInt(req.session.userId);
            const completedOrder = await prisma.order.findFirst({
                where: {
                    buyer_id: buyerId,
                    status: 'COMPLETED',
                    order_items: {
                        some: {
                            product_id: productId
                        }
                    }
                }
            });
            if (completedOrder) {
                const existingReview = await prisma.productReview.findFirst({
                    where: {
                        product_id: productId,
                        buyer_id: buyerId
                    }
                });
                if (!existingReview) {
                    canReview = true;
                }
            }
        }

        res.status(200).json({
            ...response,
            rating: avgRating,
            reviewCount: ratings.length,
            canReview
        });
    } catch (error) {
        handleError(res, error);
    }
};

export const createProduct = async (req, res) => {
    try {
        const { name, description, price, stock, images, category } = req.body;
        if (!name) return res.status(400).json({ msg: "Nama produk wajib diisi" });

        const store = await prisma.store.findFirst({
            where: { seller_id: req.userId }
        });
        if (!store) {
            return res.status(400).json({ msg: "Anda harus membuat toko terlebih dahulu sebelum menambahkan produk" });
        }

        const sanitizedName = sanitizeText(name);
        const sanitizedDesc = description ? sanitizeText(description) : null;
        const sanitizedCategory = category ? sanitizeText(category) : "Jelajahi";

        const parsedPrice = parseFloat(price);
        const parsedStock = parseInt(stock);

        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            return res.status(400).json({ msg: "Harga produk harus berupa angka positif lebih besar dari 0" });
        }
        if (isNaN(parsedStock) || parsedStock < 0) {
            return res.status(400).json({ msg: "Stok produk tidak boleh bernilai negatif" });
        }

        const productData = {
            store_id: store.id,
            name: sanitizedName,
            description: sanitizedDesc,
            price: parsedPrice,
            stock: parsedStock,
            category: sanitizedCategory
        };

        if (images && images.length > 0) {
            productData.images = {
                create: images.map(url => ({ image_url: url }))
            };
        }

        const newProduct = await prisma.product.create({
            data: productData,
            include: { images: true }
        });

        res.status(201).json({ msg: "Produk berhasil ditambahkan", product: newProduct });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const updateProduct = async (req, res) => {
    try {
        const productId = BigInt(req.params.id);
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { store: true }
        });
        if (!product) return res.status(404).json({ msg: "Produk tidak ditemukan" });

        if (req.role !== 'ADMIN' && product.store.seller_id !== req.userId) {
            return res.status(403).json({ msg: "Anda tidak memiliki akses untuk mengubah produk ini" });
        }

        const { name, description, price, stock, images, category } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = sanitizeText(name);
        if (description !== undefined) updateData.description = description ? sanitizeText(description) : null;
        if (price !== undefined) {
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice) || parsedPrice <= 0) {
                return res.status(400).json({ msg: "Harga produk harus berupa angka positif lebih besar dari 0" });
            }
            updateData.price = parsedPrice;
        }
        if (stock !== undefined) {
            const parsedStock = parseInt(stock);
            if (isNaN(parsedStock) || parsedStock < 0) {
                return res.status(400).json({ msg: "Stok produk tidak boleh bernilai negatif" });
            }
            updateData.stock = parsedStock;
        }
        if (category !== undefined) updateData.category = category ? sanitizeText(category) : "Jelajahi";

        if (images !== undefined) {
            await prisma.productImage.deleteMany({
                where: { product_id: productId }
            });
            if (images.length > 0) {
                updateData.images = {
                    create: images.map(url => ({ image_url: url }))
                };
            }
        }

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: updateData,
            include: { images: true }
        });

        res.status(200).json({ msg: "Produk berhasil diperbarui", product: updatedProduct });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const productId = BigInt(req.params.id);
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { store: true }
        });
        if (!product) return res.status(404).json({ msg: "Produk tidak ditemukan" });

        if (req.role !== 'ADMIN' && product.store.seller_id !== req.userId) {
            return res.status(403).json({ msg: "Anda tidak memiliki akses untuk menghapus produk ini" });
        }

        await prisma.productImage.deleteMany({ where: { product_id: productId } });
        await prisma.product.delete({ where: { id: productId } });

        res.status(200).json({ msg: "Produk berhasil dihapus" });
    } catch (error) {
        handleError(res, error);
    }
};

export const getProductReviews = async (req, res) => {
    try {
        const productId = BigInt(req.params.id);
        const reviews = await prisma.productReview.findMany({
            where: { product_id: productId },
            include: {
                buyer: {
                    select: { full_name: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        res.status(200).json(reviews);
    } catch (error) {
        handleError(res, error);
    }
};

export const createProductReview = async (req, res) => {
    try {
        const productId = BigInt(req.params.id);
        const buyerId = req.userId;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ msg: "Rating harus antara 1 dan 5" });
        }

        // Check if buyer has a completed order with this product
        const completedOrder = await prisma.order.findFirst({
            where: {
                buyer_id: buyerId,
                status: 'COMPLETED',
                order_items: {
                    some: { product_id: productId }
                }
            }
        });

        if (!completedOrder) {
            return res.status(403).json({ msg: "Anda hanya dapat memberikan ulasan untuk produk yang sudah dibeli dan pesanannya selesai" });
        }

        // Check if review already exists
        const existing = await prisma.productReview.findFirst({
            where: { product_id: productId, buyer_id: buyerId }
        });

        if (existing) {
            return res.status(400).json({ msg: "Anda sudah memberikan ulasan untuk produk ini" });
        }

        const review = await prisma.productReview.create({
            data: {
                product_id: productId,
                buyer_id: buyerId,
                rating: parseInt(rating),
                comment: comment ? sanitizeText(comment) : null
            }
        });

        res.status(201).json({ msg: "Ulasan berhasil ditambahkan", review });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const getSellerProducts = async (req, res) => {
    try {
        const store = await prisma.store.findFirst({
            where: { seller_id: req.userId }
        });
        if (!store) {
            return res.status(404).json({ msg: "Toko tidak ditemukan" });
        }

        const products = await prisma.product.findMany({
            where: { store_id: store.id },
            include: {
                images: true,
                reviews: { select: { rating: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        const mapped = products.map(p => {
            const ratings = p.reviews.map(r => r.rating);
            const avgRating = ratings.length > 0
                ? parseFloat((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1))
                : 0;
            return { ...p, rating: avgRating, reviewCount: ratings.length };
        });

        res.status(200).json(mapped);
    } catch (error) {
        handleError(res, error);
    }
};
