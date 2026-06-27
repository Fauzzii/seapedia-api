import prisma from '../config/prisma.js';
import { handleError } from '../utils/errorHandler.js';

export const getCart = async (req, res) => {
    try {
        const cart = await prisma.cart.findUnique({
            where: { buyer_id: req.userId },
            include: {
                store: {
                    select: { id: true, store_name: true }
                },
                cart_items: {
                    include: {
                        product: {
                            select: { id: true, name: true, price: true, stock: true, images: true }
                        }
                    }
                }
            }
        });

        if (!cart) {
            return res.status(200).json({ msg: "Keranjang kosong", cart_items: [] });
        }

        res.status(200).json(cart);
    } catch (error) {
        handleError(res, error);
    }
};

export const addToCart = async (req, res) => {
    try {
        const productId = BigInt(req.body.product_id);
        const quantity = parseInt(req.body.quantity);

        const product = await prisma.product.findUnique({
            where: { id: productId }
        });
        if (!product) return res.status(404).json({ msg: "Produk tidak ditemukan" });
        if (product.stock < quantity) {
            return res.status(400).json({ msg: `Stok tidak mencukupi. Stok saat ini: ${product.stock}` });
        }

        let cart = await prisma.cart.findUnique({
            where: { buyer_id: req.userId }
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: {
                    buyer_id: req.userId,
                    store_id: product.store_id
                }
            });
        } else if (cart.store_id !== product.store_id) {
            return res.status(400).json({
                msg: "Keranjang Anda berisi produk dari toko lain. Kosongkan keranjang terlebih dahulu jika ingin membeli dari toko ini."
            });
        }

        const existingItem = await prisma.cartItem.findFirst({
            where: {
                cart_id: cart.id,
                product_id: productId
            }
        });

        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (product.stock < newQuantity) {
                return res.status(400).json({ msg: `Total kuantitas (${newQuantity}) melebihi stok yang tersedia (${product.stock})` });
            }

            await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: newQuantity }
            });
        } else {
            await prisma.cartItem.create({
                data: {
                    cart_id: cart.id,
                    product_id: productId,
                    quantity
                }
            });
        }

        res.status(200).json({ msg: "Produk berhasil ditambahkan ke keranjang" });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const updateCartItem = async (req, res) => {
    try {
        const cartItemId = BigInt(req.params.id);
        const quantity = parseInt(req.body.quantity);

        const cartItem = await prisma.cartItem.findUnique({
            where: { id: cartItemId },
            include: {
                cart: true,
                product: true
            }
        });

        if (!cartItem || cartItem.cart.buyer_id !== req.userId) {
            return res.status(404).json({ msg: "Item keranjang tidak ditemukan" });
        }

        if (cartItem.product.stock < quantity) {
            return res.status(400).json({ msg: `Stok tidak mencukupi. Stok saat ini: ${cartItem.product.stock}` });
        }

        await prisma.cartItem.update({
            where: { id: cartItemId },
            data: { quantity }
        });

        res.status(200).json({ msg: "Kuantitas item keranjang berhasil diperbarui" });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const deleteCartItem = async (req, res) => {
    try {
        const cartItemId = BigInt(req.params.id);

        const cartItem = await prisma.cartItem.findUnique({
            where: { id: cartItemId },
            include: { cart: true }
        });

        if (!cartItem || cartItem.cart.buyer_id !== req.userId) {
            return res.status(404).json({ msg: "Item keranjang tidak ditemukan" });
        }

        const cartId = cartItem.cart_id;

        await prisma.cartItem.delete({
            where: { id: cartItemId }
        });

        const remainingItems = await prisma.cartItem.count({
            where: { cart_id: cartId }
        });

        if (remainingItems === 0) {
            await prisma.cart.delete({
                where: { id: cartId }
            });
        }

        res.status(200).json({ msg: "Item keranjang berhasil dihapus" });
    } catch (error) {
        handleError(res, error);
    }
};

export const clearCart = async (req, res) => {
    try {
        const cart = await prisma.cart.findUnique({
            where: { buyer_id: req.userId }
        });

        if (!cart) return res.status(400).json({ msg: "Keranjang sudah kosong" });

        await prisma.cartItem.deleteMany({
            where: { cart_id: cart.id }
        });

        await prisma.cart.delete({
            where: { id: cart.id }
        });

        res.status(200).json({ msg: "Keranjang berhasil dikosongkan" });
    } catch (error) {
        handleError(res, error);
    }
};
