import prisma from '../config/prisma.js';
import { handleError } from '../utils/errorHandler.js';

export const getAddresses = async (req, res) => {
    try {
        const addresses = await prisma.address.findMany({
            where: { buyer_id: req.userId }
        });
        res.status(200).json(addresses);
    } catch (error) {
        handleError(res, error);
    }
};

export const createAddress = async (req, res) => {
    try {
        const { recipient_name, phone, address_detail, is_default } = req.body;
        const buyer_id = req.userId;

        const defaultFlag = is_default === true || is_default === 'true';

        const result = await prisma.$transaction(async (tx) => {
            if (defaultFlag) {
                await tx.address.updateMany({
                    where: { buyer_id, is_default: true },
                    data: { is_default: false }
                });
            }

            const addressCount = await tx.address.count({
                where: { buyer_id }
            });
            const shouldBeDefault = addressCount === 0 ? true : defaultFlag;

            const address = await tx.address.create({
                data: {
                    buyer_id,
                    recipient_name,
                    phone,
                    address_detail,
                    is_default: shouldBeDefault
                }
            });
            return address;
        });

        res.status(201).json({ msg: "Alamat berhasil ditambahkan", address: result });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const updateAddress = async (req, res) => {
    try {
        const addressId = BigInt(req.params.id);
        const { recipient_name, phone, address_detail, is_default } = req.body;
        const buyer_id = req.userId;

        const address = await prisma.address.findUnique({
            where: { id: addressId }
        });

        if (!address || address.buyer_id !== buyer_id) {
            return res.status(404).json({ msg: "Alamat tidak ditemukan" });
        }

        const defaultFlag = is_default === true || is_default === 'true';

        const result = await prisma.$transaction(async (tx) => {
            if (defaultFlag && !address.is_default) {
                await tx.address.updateMany({
                    where: { buyer_id, is_default: true },
                    data: { is_default: false }
                });
            }

            const updated = await tx.address.update({
                where: { id: addressId },
                data: {
                    recipient_name: recipient_name || address.recipient_name,
                    phone: phone || address.phone,
                    address_detail: address_detail || address.address_detail,
                    is_default: defaultFlag || address.is_default
                }
            });
            return updated;
        });

        res.status(200).json({ msg: "Alamat berhasil diperbarui", address: result });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const addressId = BigInt(req.params.id);
        const buyer_id = req.userId;

        const address = await prisma.address.findUnique({
            where: { id: addressId }
        });

        if (!address || address.buyer_id !== buyer_id) {
            return res.status(404).json({ msg: "Alamat tidak ditemukan" });
        }

        await prisma.$transaction(async (tx) => {
            await tx.address.delete({
                where: { id: addressId }
            });

            if (address.is_default) {
                const anotherAddress = await tx.address.findFirst({
                    where: { buyer_id }
                });
                if (anotherAddress) {
                    await tx.address.update({
                        where: { id: anotherAddress.id },
                        data: { is_default: true }
                    });
                }
            }
        });

        res.status(200).json({ msg: "Alamat berhasil dihapus" });
    } catch (error) {
        handleError(res, error);
    }
};
