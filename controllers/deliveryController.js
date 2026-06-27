import prisma from '../config/prisma.js';
import { handleError } from '../utils/errorHandler.js';
import { getCurrentTime } from '../utils/timeHelper.js';

export const getAvailableJobs = async (req, res) => {
    try {
        const jobs = await prisma.deliveryJob.findMany({
            where: { status: 'AVAILABLE' },
            include: {
                order: {
                    select: {
                        id: true,
                        shipping_recipient_name: true,
                        shipping_phone: true,
                        shipping_address: true,
                        delivery_method: true,
                        store: {
                            select: {
                                store_name: true,
                                address_detail: true
                            }
                        }
                    }
                }
            }
        });
        res.status(200).json(jobs);
    } catch (error) {
        handleError(res, error);
    }
};

export const takeJob = async (req, res) => {
    try {
        const jobId = BigInt(req.params.id);
        const now = await getCurrentTime();

        const result = await prisma.$transaction(async (tx) => {
            const job = await tx.deliveryJob.findUnique({
                where: { id: jobId }
            });
            if (!job) throw new Error("Pekerjaan pengiriman tidak ditemukan");

            const updated = await tx.deliveryJob.updateMany({
                where: {
                    id: jobId,
                    status: 'AVAILABLE'
                },
                data: {
                    status: 'TAKEN',
                    driver_id: req.userId,
                    taken_at: now
                }
            });

            if (updated.count === 0) {
                throw new Error("Pekerjaan ini sudah diambil oleh driver lain");
            }

            await tx.order.update({
                where: { id: job.order_id },
                data: { status: 'IN_DELIVERY' }
            });

            await tx.orderStatusHistory.create({
                data: {
                    order_id: job.order_id,
                    status: 'IN_DELIVERY',
                    notes: "Kurir telah mengambil pesanan dan dalam perjalanan mengirim barang."
                }
            });

            return {
                id: jobId,
                status: 'TAKEN',
                driver_id: req.userId,
                taken_at: now
            };
        });

        res.status(200).json({ msg: "Pekerjaan pengiriman berhasil diambil", job: result });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const completeJob = async (req, res) => {
    try {
        const jobId = BigInt(req.params.id);
        const now = await getCurrentTime();

        const result = await prisma.$transaction(async (tx) => {
            const job = await tx.deliveryJob.findUnique({
                where: { id: jobId },
                include: {
                    order: {
                        include: { store: true }
                    }
                }
            });

            if (!job) throw new Error("Pekerjaan pengiriman tidak ditemukan");
            if (job.driver_id !== req.userId) {
                throw new Error("Pekerjaan ini tidak ditugaskan kepada Anda");
            }
            if (job.status !== 'TAKEN') {
                throw new Error("Pekerjaan ini tidak dalam proses pengiriman");
            }

            const completedJob = await tx.deliveryJob.update({
                where: { id: jobId },
                data: {
                    status: 'COMPLETED',
                    completed_at: now
                }
            });

            const order = await tx.order.findUnique({
                where: { id: job.order_id },
                include: { store: true }
            });

            if (order && order.status !== 'COMPLETED' && order.status !== 'RETURNED' && order.status !== 'CANCELLED') {
                await tx.order.update({
                    where: { id: order.id },
                    data: { status: 'COMPLETED' }
                });

                await tx.orderStatusHistory.create({
                    data: {
                        order_id: order.id,
                        status: 'COMPLETED',
                        notes: "Pesanan diselesaikan via konfirmasi pengiriman kurir. Transaksi selesai."
                    }
                });

                const driverId = job.driver_id || req.userId;
                if (driverId) {
                    let driverWallet = await tx.wallet.findUnique({ where: { user_id: driverId } });
                    if (!driverWallet) {
                        driverWallet = await tx.wallet.create({ data: { user_id: driverId, balance: 0.00 } });
                    }
                    await tx.wallet.update({
                        where: { id: driverWallet.id },
                        data: { balance: { increment: job.earning } }
                    });
                    await tx.walletTransaction.create({
                        data: {
                            wallet_id: driverWallet.id,
                            type: 'TOPUP',
                            amount: job.earning,
                            description: `Pendapatan kurir untuk pengantaran pesanan ID ${order.id}`
                        }
                    });
                }

                const sellerId = order.store.seller_id;
                let sellerWallet = await tx.wallet.findUnique({ where: { user_id: sellerId } });
                if (!sellerWallet) {
                    sellerWallet = await tx.wallet.create({ data: { user_id: sellerId, balance: 0.00 } });
                }
                const productEarnings = parseFloat(order.subtotal) - parseFloat(order.discount_amount);
                await tx.wallet.update({
                    where: { id: sellerWallet.id },
                    data: { balance: { increment: productEarnings } }
                });
                await tx.walletTransaction.create({
                    data: {
                        wallet_id: sellerWallet.id,
                        type: 'TOPUP',
                        amount: productEarnings,
                        description: `Pendapatan penjualan produk pesanan ID ${order.id}`
                    }
                });
            }

            return completedJob;
        });

        res.status(200).json({ msg: "Pengantaran selesai. Pesanan telah berhasil diselesaikan.", job: result });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const getJobById = async (req, res) => {
    try {
        const jobId = BigInt(req.params.id);
        const job = await prisma.deliveryJob.findUnique({
            where: { id: jobId },
            include: {
                order: {
                    include: {
                        order_items: true,
                        store: true,
                        buyer: true
                    }
                }
            }
        });
        if (!job) return res.status(404).json({ msg: "Pekerjaan pengiriman tidak ditemukan" });
        res.status(200).json(job);
    } catch (error) {
        handleError(res, error);
    }
};

export const getDriverHistory = async (req, res) => {
    try {
        const driverId = req.userId;
        const history = await prisma.deliveryJob.findMany({
            where: { driver_id: driverId, status: 'COMPLETED' },
            include: {
                order: {
                    include: {
                        order_status_histories: { orderBy: { created_at: 'asc' } }
                    }
                }
            },
            orderBy: { completed_at: 'desc' }
        });
        res.status(200).json(history);
    } catch (error) {
        handleError(res, error);
    }
};

export const getDriverEarnings = async (req, res) => {
    try {
        const driverId = req.userId;
        const completedJobs = await prisma.deliveryJob.findMany({
            where: { driver_id: driverId, status: 'COMPLETED' }
        });
        const totalEarnings = completedJobs.reduce((sum, job) => sum + parseFloat(job.earning), 0);

        res.status(200).json({
            driverId,
            completedJobsCount: completedJobs.length,
            totalEarnings,
            jobs: completedJobs
        });
    } catch (error) {
        handleError(res, error);
    }
};
