import prisma from '../config/index.js';
import { handleError } from '../utils/errorHandler.js';
import { sanitizeText } from '../utils/sanitizer.js';

export const getStores = async (req, res) => {
    try {
        const response = await prisma.store.findMany();
        res.status(200).json(response);
    } catch (error) {
        handleError(res, error);
    }
};

export const getStoreById = async (req, res) => {
    try {
        const response = await prisma.store.findUnique({
            where: { id: BigInt(req.params.id) }
        });
        if (!response) return res.status(404).json({ msg: "Toko tidak ditemukan" });
        res.status(200).json(response);
    } catch (error) {
        handleError(res, error);
    }
};

export const createStore = async (req, res) => {
    try {
        const { store_name, description, address_detail } = req.body;
        if (!store_name) return res.status(400).json({ msg: "Nama toko wajib diisi" });

        const sanitizedName = sanitizeText(store_name);
        const sanitizedDesc = description ? sanitizeText(description) : null;
        const sanitizedAddress = address_detail ? sanitizeText(address_detail) : null;

        const existingStore = await prisma.store.findFirst({
            where: { seller_id: req.userId }
        });
        if (existingStore) {
            return res.status(400).json({ msg: "Anda hanya boleh memiliki satu toko" });
        }

        const nameDuplicate = await prisma.store.findUnique({
            where: { store_name: sanitizedName }
        });
        if (nameDuplicate) {
            return res.status(400).json({ msg: "Nama toko sudah digunakan" });
        }

        const newStore = await prisma.store.create({
            data: {
                seller_id: req.userId,
                store_name: sanitizedName,
                description: sanitizedDesc,
                address_detail: sanitizedAddress
            }
        });

        res.status(201).json({ msg: "Toko berhasil dibuat", store: newStore });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const updateStore = async (req, res) => {
    try {
        const storeId = BigInt(req.params.id);
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });
        if (!store) return res.status(404).json({ msg: "Toko tidak ditemukan" });

        if (req.role !== 'ADMIN' && store.seller_id !== req.userId) {
            return res.status(403).json({ msg: "Anda tidak memiliki akses untuk mengubah toko ini" });
        }

        const { store_name, description, address_detail } = req.body;

        if (store_name && store_name !== store.store_name) {
            const nameDuplicate = await prisma.store.findUnique({
                where: { store_name }
            });
            if (nameDuplicate) {
                return res.status(400).json({ msg: "Nama toko sudah digunakan" });
            }
        }

        const updatedStore = await prisma.store.update({
            where: { id: storeId },
            data: {
                store_name,
                description,
                address_detail
            }
        });

        res.status(200).json({ msg: "Toko berhasil diperbarui", store: updatedStore });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const deleteStore = async (req, res) => {
    try {
        const storeId = BigInt(req.params.id);
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });
        if (!store) return res.status(404).json({ msg: "Toko tidak ditemukan" });

        if (req.role !== 'ADMIN' && store.seller_id !== req.userId) {
            return res.status(403).json({ msg: "Anda tidak memiliki akses untuk menghapus toko ini" });
        }

        await prisma.store.delete({
            where: { id: storeId }
        });

        res.status(200).json({ msg: "Toko berhasil dihapus" });
    } catch (error) {
        handleError(res, error);
    }
};

export const updateSellerStore = async (req, res) => {
    try {
        const store = await prisma.store.findUnique({
            where: { seller_id: req.userId }
        });
        if (!store) return res.status(404).json({ msg: "Toko tidak ditemukan" });

        const { store_name, description, address_detail } = req.body;

        const sanitizedName = store_name ? sanitizeText(store_name) : undefined;
        const sanitizedDesc = description !== undefined ? sanitizeText(description) : undefined;
        const sanitizedAddress = address_detail !== undefined ? sanitizeText(address_detail) : undefined;

        if (sanitizedName && sanitizedName !== store.store_name) {
            const nameDuplicate = await prisma.store.findUnique({
                where: { store_name: sanitizedName }
            });
            if (nameDuplicate) {
                return res.status(400).json({ msg: "Nama toko sudah digunakan" });
            }
        }

        const updatedStore = await prisma.store.update({
            where: { id: store.id },
            data: {
                store_name: sanitizedName || store.store_name,
                description: sanitizedDesc !== undefined ? sanitizedDesc : store.description,
                address_detail: sanitizedAddress !== undefined ? sanitizedAddress : store.address_detail
            }
        });

        res.status(200).json({ msg: "Toko berhasil diperbarui", store: updatedStore });
    } catch (error) {
        handleError(res, error, 400);
    }
};
