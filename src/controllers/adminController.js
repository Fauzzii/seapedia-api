import prisma from '../config/index.js';
import { handleError } from '../utils/errorHandler.js';
import bcrypt from 'bcrypt';
import { getCurrentTime, updateTimeCache } from '../helpers/time.js';

export const getMonitoringUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 0;
        let queryOptions = {
            include: { user_roles: { include: { role: true } } }
        };
        if (page > 0 && limit > 0) {
            queryOptions.skip = (page - 1) * limit;
            queryOptions.take = limit;
        }
        const total = await prisma.user.count();
        const users = await prisma.user.findMany(queryOptions);
        if (page > 0 && limit > 0) {
            return res.status(200).json({ data: users, total, pages: Math.ceil(total / limit) });
        }
        res.status(200).json(users);
    } catch (error) {
        handleError(res, error);
    }
};

export const getMonitoringStores = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 0;
        let queryOptions = {
            include: { seller: true }
        };
        if (page > 0 && limit > 0) {
            queryOptions.skip = (page - 1) * limit;
            queryOptions.take = limit;
        }
        const total = await prisma.store.count();
        const stores = await prisma.store.findMany(queryOptions);
        if (page > 0 && limit > 0) {
            return res.status(200).json({ data: stores, total, pages: Math.ceil(total / limit) });
        }
        res.status(200).json(stores);
    } catch (error) {
        handleError(res, error);
    }
};

export const getMonitoringProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 0;
        let queryOptions = {
            include: { store: true }
        };
        if (page > 0 && limit > 0) {
            queryOptions.skip = (page - 1) * limit;
            queryOptions.take = limit;
        }
        const total = await prisma.product.count();
        const products = await prisma.product.findMany(queryOptions);
        if (page > 0 && limit > 0) {
            return res.status(200).json({ data: products, total, pages: Math.ceil(total / limit) });
        }
        res.status(200).json(products);
    } catch (error) {
        handleError(res, error);
    }
};

export const getMonitoringOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 0;
        let queryOptions = {
            include: { 
                buyer: true, 
                store: true, 
                order_items: { 
                    include: { 
                        product: { 
                            include: { 
                                images: true 
                            } 
                        } 
                    } 
                }, 
                order_status_histories: { 
                    orderBy: { created_at: 'desc' } 
                },
                delivery_job: { 
                    include: { driver: true } 
                } 
            },
            orderBy: { created_at: 'desc' }
        };
        if (page > 0 && limit > 0) {
            queryOptions.skip = (page - 1) * limit;
            queryOptions.take = limit;
        }
        const total = await prisma.order.count();
        const orders = await prisma.order.findMany(queryOptions);
        if (page > 0 && limit > 0) {
            return res.status(200).json({ data: orders, total, pages: Math.ceil(total / limit) });
        }
        res.status(200).json(orders);
    } catch (error) {
        handleError(res, error);
    }
};

export const getMonitoringDiscounts = async (req, res) => {
    try {
        const vouchers = await prisma.voucher.findMany();
        const promos = await prisma.promo.findMany();
        res.status(200).json({ vouchers, promos });
    } catch (error) {
        handleError(res, error);
    }
};

export const getMonitoringDeliveries = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 0;
        let queryOptions = {
            include: { order: true, driver: true }
        };
        if (page > 0 && limit > 0) {
            queryOptions.skip = (page - 1) * limit;
            queryOptions.take = limit;
        }
        const total = await prisma.deliveryJob.count();
        const deliveries = await prisma.deliveryJob.findMany(queryOptions);
        if (page > 0 && limit > 0) {
            return res.status(200).json({ data: deliveries, total, pages: Math.ceil(total / limit) });
        }
        res.status(200).json(deliveries);
    } catch (error) {
        handleError(res, error);
    }
};

export const getMonitoringOverdue = async (req, res) => {
    try {
        const now = await getCurrentTime();
        const overdueOrders = await prisma.order.findMany({
            where: {
                status: { in: ['PACKAGING', 'WAITING_FOR_DRIVER', 'IN_DELIVERY'] },
                expired_at: { lt: now }
            },
            include: { buyer: true, store: true }
        });
        res.status(200).json(overdueOrders);
    } catch (error) {
        handleError(res, error);
    }
};

export const createVoucher = async (req, res) => {
    try {
        const { name, code, discount_type, discount_value, remaining_usage, expiry_date } = req.body;
        if (!name || !code || !discount_type || !discount_value || !remaining_usage || !expiry_date) {
            return res.status(400).json({ msg: "Semua field voucher wajib diisi" });
        }

        const parsedValue = parseFloat(discount_value);
        const parsedUsage = parseInt(remaining_usage);

        if (isNaN(parsedValue) || parsedValue <= 0) {
            return res.status(400).json({ msg: "Nilai potongan harus lebih besar dari 0" });
        }
        if (discount_type === 'PERCENTAGE' && parsedValue > 100) {
            return res.status(400).json({ msg: "Persentase potongan tidak boleh melebihi 100%" });
        }
        if (isNaN(parsedUsage) || parsedUsage < 1) {
            return res.status(400).json({ msg: "Kuota penggunaan voucher minimal harus 1" });
        }

        const voucher = await prisma.voucher.create({
            data: {
                name,
                code,
                discount_type,
                discount_value: parsedValue,
                remaining_usage: parsedUsage,
                expiry_date: new Date(expiry_date)
            }
        });
        res.status(201).json({ msg: "Voucher berhasil dibuat", voucher });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const getVouchers = async (req, res) => {
    try {
        const vouchers = await prisma.voucher.findMany();
        res.status(200).json(vouchers);
    } catch (error) {
        handleError(res, error);
    }
};

export const getVoucherById = async (req, res) => {
    try {
        const voucher = await prisma.voucher.findUnique({
            where: { id: BigInt(req.params.id) }
        });
        if (!voucher) return res.status(404).json({ msg: "Voucher tidak ditemukan" });
        res.status(200).json(voucher);
    } catch (error) {
        handleError(res, error);
    }
};

export const createPromo = async (req, res) => {
    try {
        const { name, code, discount_type, discount_value, expiry_date } = req.body;
        if (!name || !code || !discount_type || !discount_value || !expiry_date) {
            return res.status(400).json({ msg: "Semua field promo wajib diisi" });
        }

        const parsedValue = parseFloat(discount_value);

        if (isNaN(parsedValue) || parsedValue <= 0) {
            return res.status(400).json({ msg: "Nilai potongan harus lebih besar dari 0" });
        }
        if (discount_type === 'PERCENTAGE' && parsedValue > 100) {
            return res.status(400).json({ msg: "Persentase potongan tidak boleh melebihi 100%" });
        }

        const promo = await prisma.promo.create({
            data: {
                name,
                code,
                discount_type,
                discount_value: parsedValue,
                expiry_date: new Date(expiry_date)
            }
        });
        res.status(201).json({ msg: "Promo berhasil dibuat", promo });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const getPromos = async (req, res) => {
    try {
        const promos = await prisma.promo.findMany();
        res.status(200).json(promos);
    } catch (error) {
        handleError(res, error);
    }
};

export const getPromoById = async (req, res) => {
    try {
        const promo = await prisma.promo.findUnique({
            where: { id: BigInt(req.params.id) }
        });
        if (!promo) return res.status(404).json({ msg: "Promo tidak ditemukan" });
        res.status(200).json(promo);
    } catch (error) {
        handleError(res, error);
    }
};

export const advanceTime = async (req, res) => {
    try {
        const days = parseInt(req.body.days || 0);
        const hours = parseInt(req.body.hours || 0);

        if (days === 0 && hours === 0) {
            return res.status(400).json({ msg: "Masukkan durasi hari atau jam yang valid untuk dimajukan" });
        }

        let setting = await prisma.systemSetting.findFirst();
        let baseTime = setting ? new Date(setting.current_datetime) : new Date();

        const advancedTime = new Date(baseTime.getTime() + (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000));

        if (setting) {
            setting = await prisma.systemSetting.update({
                where: { id: setting.id },
                data: { current_datetime: advancedTime }
            });
        } else {
            setting = await prisma.systemSetting.create({
                data: { current_datetime: advancedTime }
            });
        }

        updateTimeCache(setting.current_datetime);

        res.status(200).json({
            msg: `Waktu sistem berhasil dimajukan sebanyak ${days} hari dan ${hours} jam`,
            previousTime: baseTime.toISOString(),
            simulatedNow: setting.current_datetime.toISOString()
        });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const runOverdueCheck = async (req, res) => {
    try {
        const now = await getCurrentTime();

        const overdueOrders = await prisma.order.findMany({
            where: {
                status: { in: ['PACKAGING', 'WAITING_FOR_DRIVER', 'IN_DELIVERY'] },
                expired_at: { lt: now }
            },
            include: { order_items: true }
        });

        if (overdueOrders.length === 0) {
            return res.status(200).json({ msg: "Tidak ada pesanan overdue saat ini.", processedCount: 0, processedIds: [] });
        }

        const processedIds = [];

        const promises = overdueOrders.map((order) => {
            return prisma.$transaction(async (tx) => {
                await tx.order.update({
                    where: { id: order.id },
                    data: { status: 'RETURNED', returned_at: now }
                });

                await tx.orderStatusHistory.create({
                    data: {
                        order_id: order.id,
                        status: 'RETURNED',
                        notes: "Batas waktu SLA pengiriman berakhir. Pesanan dibatalkan otomatis oleh sistem (Overdue)."
                    }
                });

                let wallet = await tx.wallet.findUnique({
                    where: { user_id: order.buyer_id }
                });
                if (!wallet) {
                    wallet = await tx.wallet.create({
                        data: { user_id: order.buyer_id, balance: 0.00 }
                    });
                }

                await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { increment: order.final_total } }
                });

                await tx.walletTransaction.create({
                    data: {
                        wallet_id: wallet.id,
                        type: 'REFUND',
                        amount: order.final_total,
                        description: `Pengembalian dana (Refund) untuk pesanan Overdue ID ${order.id}`
                    }
                });

                for (const item of order.order_items) {
                    await tx.product.update({
                        where: { id: item.product_id },
                        data: { stock: { increment: item.quantity } }
                    });
                }

                const deliveryJob = await tx.deliveryJob.findUnique({
                    where: { order_id: order.id }
                });
                if (deliveryJob && deliveryJob.status !== 'COMPLETED') {
                    await tx.deliveryJob.update({
                        where: { id: deliveryJob.id },
                        data: { status: 'COMPLETED', completed_at: now }
                    });
                }
            }, {
                maxWait: 15000,
                timeout: 30000
            });
        });

        await Promise.all(promises);
        processedIds.push(...overdueOrders.map(o => o.id.toString()));

        res.status(200).json({
            msg: `Berhasil memproses ${processedIds.length} pesanan overdue yang terlambat SLA`,
            processedCount: processedIds.length,
            processedIds
        });
    } catch (error) {
        handleError(res, error);
    }
};

export const adminCreateUser = async (req, res) => {
    try {
        const { full_name, email, password, role } = req.body;
        if (!full_name || !email || !password || !role) {
            return res.status(400).json({ msg: "Semua field wajib diisi" });
        }

        const salt = await bcrypt.genSalt();
        const hashPassword = await bcrypt.hash(password, salt);

        const targetRoleName = role.toUpperCase();
        let dbRole = await prisma.role.findFirst({
            where: { name: targetRoleName }
        });

        if (!dbRole) {
            dbRole = await prisma.role.create({
                data: { name: targetRoleName }
            });
        }

        const newUser = await prisma.user.create({
            data: {
                full_name,
                email,
                password: hashPassword,
                active_role_id: dbRole.id,
                user_roles: {
                    create: {
                        role_id: dbRole.id
                    }
                }
            }
        });
        res.status(201).json({ msg: "User berhasil dibuat oleh Admin", user: { id: newUser.id.toString(), email: newUser.email } });
    } catch (error) {
        handleError(res, error, 400);
    }
};
