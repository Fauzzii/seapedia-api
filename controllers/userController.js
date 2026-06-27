import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import { handleError } from "../utils/errorHandler.js";
import { getCurrentTime } from "../utils/timeHelper.js";

export const getUsers = async (req, res) => {
    try {
        const response = await prisma.user.findMany({
            select: {
                id: true,
                full_name: true,
                email: true,
                active_role: {
                    select: {
                        name: true
                    }
                }
            }
        });
        const mapped = response.map(u => ({
            id: u.id,
            full_name: u.full_name,
            email: u.email,
            role: u.active_role?.name || null
        }));
        res.status(200).json(mapped);
    } catch (error) {
        handleError(res, error);
    }
};

export const getUserById = async (req, res) => {
    try {
        const idParam = BigInt(req.params.id);
        if (req.role !== 'ADMIN' && idParam !== req.userId) {
            return res.status(403).json({ msg: "Akses ditolak! Anda tidak memiliki wewenang melihat data ini." });
        }

        const response = await prisma.user.findUnique({
            where: { id: idParam },
            select: {
                id: true,
                full_name: true,
                email: true,
                active_role: {
                    select: {
                        name: true
                    }
                }
            }
        });
        if (!response) return res.status(404).json({ msg: "User tidak ditemukan" });
        res.status(200).json({
            id: response.id,
            full_name: response.full_name,
            email: response.email,
            role: response.active_role?.name || null
        });
    } catch (error) {
        handleError(res, error);
    }
};

export const createUser = async (req, res) => {
    try {
        const { full_name, email, password, role } = req.body;

        const salt = await bcrypt.genSalt();
        const hashPassword = await bcrypt.hash(password, salt);

        const targetRoleName = (role && ['BUYER', 'SELLER', 'DRIVER'].includes(role.toUpperCase())) 
            ? role.toUpperCase() 
            : 'BUYER';

        let dbRole = await prisma.role.findFirst({
            where: { name: targetRoleName }
        });

        if (!dbRole) {
            dbRole = await prisma.role.create({
                data: { name: targetRoleName }
            });
        }

        await prisma.user.create({
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
        res.status(201).json({ msg: "Registrasi berhasil" });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const updateUser = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: BigInt(req.params.id) }
        });
        if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

        if (req.role !== "ADMIN" && BigInt(req.params.id) !== req.userId) {
            return res.status(403).json({ msg: "Kamu tidak punya akses mengubah data orang lain!" });
        }

        const { full_name, email, password } = req.body;

        let hashPassword;
        if (!password) {
            hashPassword = user.password;
        } else {
            const salt = await bcrypt.genSalt();
            hashPassword = await bcrypt.hash(password, salt);
        }

        const updateData = { full_name, email, password: hashPassword };

        if (req.role === 'ADMIN' && req.body.role) {
            const targetRole = await prisma.role.findFirst({
                where: { name: req.body.role }
            });
            if (targetRole) {
                updateData.active_role_id = targetRole.id;
                await prisma.userRole.upsert({
                    where: {
                        user_id_role_id: {
                            user_id: user.id,
                            role_id: targetRole.id
                        }
                    },
                    create: {
                        user_id: user.id,
                        role_id: targetRole.id
                    },
                    update: {}
                });
            }
        }

        await prisma.user.update({
            where: { id: user.id },
            data: updateData
        });
        res.status(200).json({ msg: "User berhasil diperbarui" });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: BigInt(req.params.id) }
        });
        if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

        await prisma.userRole.deleteMany({
            where: { user_id: user.id }
        });

        await prisma.user.delete({
            where: { id: user.id }
        });
        res.status(200).json({ msg: "User berhasil dihapus" });
    } catch (error) {
        handleError(res, error);
    }
};

export const getDashboardSummary = async (req, res) => {
    try {
        const userId = req.userId;
        const role = req.role;

        let summary = {
            activeRole: role,
            roles: []
        };

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { user_roles: { include: { role: true } } }
        });
        if (user) {
            summary.roles = user.user_roles.map(ur => ur.role.name);
        }

        if (role === 'BUYER') {
            const [wallet, cart, ordersCount, buyerOrders] = await Promise.all([
                prisma.wallet.findUnique({ where: { user_id: userId } }),
                prisma.cart.findUnique({ where: { buyer_id: userId }, include: { cart_items: true } }),
                prisma.order.count({ where: { buyer_id: userId } }),
                prisma.order.findMany({ where: { buyer_id: userId, NOT: { status: 'RETURNED' } } })
            ]);

            const now = await getCurrentTime();
            const dailyExpenses = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
                const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
                
                const dayOrders = buyerOrders.filter(o => {
                    const cTime = new Date(o.created_at).getTime();
                    return cTime >= startOfDay.getTime() && cTime <= endOfDay.getTime();
                });
                
                const dayExpense = dayOrders.reduce((sum, o) => sum + parseFloat(o.final_total), 0);
                
                dailyExpenses.push({
                    label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
                    dateStr: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                    expense: dayExpense
                });
            }

            summary.buyer = {
                walletBalance: wallet ? parseFloat(wallet.balance) : 0,
                cartItemCount: cart ? cart.cart_items.reduce((sum, item) => sum + item.quantity, 0) : 0,
                ordersCount,
                dailyExpenses
            };
        } else if (role === 'SELLER') {
            const store = await prisma.store.findUnique({
                where: { seller_id: userId }
            });

            if (store) {
                const [productCount, pendingOrders, orders] = await Promise.all([
                    prisma.product.count({ where: { store_id: store.id } }),
                    prisma.order.count({ where: { store_id: store.id, status: 'PACKAGING' } }),
                    prisma.order.findMany({ where: { store_id: store.id, status: 'COMPLETED' } })
                ]);
                const totalIncome = orders.reduce((sum, order) => sum + (parseFloat(order.subtotal) - parseFloat(order.discount_amount)), 0);

                const now = await getCurrentTime();
                const dailyRevenue = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
                    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
                    
                    const dayOrders = orders.filter(o => {
                        const cTime = new Date(o.created_at).getTime();
                        return cTime >= startOfDay.getTime() && cTime <= endOfDay.getTime();
                    });
                    
                    const dayRevenue = dayOrders.reduce((sum, o) => sum + (parseFloat(o.subtotal) - parseFloat(o.discount_amount)), 0);
                    
                    dailyRevenue.push({
                        label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
                        dateStr: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                        revenue: dayRevenue
                    });
                }

                summary.seller = {
                    storeName: store.store_name,
                    description: store.description,
                    address_detail: store.address_detail,
                    productCount,
                    pendingOrders,
                    totalIncome,
                    dailyRevenue
                };
            } else {
                summary.seller = null;
            }
        } else if (role === 'DRIVER') {
            const [activeJob, completedJobsCount, completedJobs] = await Promise.all([
                prisma.deliveryJob.findFirst({ where: { driver_id: userId, status: 'TAKEN' } }),
                prisma.deliveryJob.count({ where: { driver_id: userId, status: 'COMPLETED' } }),
                prisma.deliveryJob.findMany({ where: { driver_id: userId, status: 'COMPLETED' } })
            ]);
            const totalEarnings = completedJobs.reduce((sum, job) => sum + parseFloat(job.earning), 0);

            const now = await getCurrentTime();
            const dailyDeliveries = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
                const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
                
                const dayJobs = completedJobs.filter(j => {
                    const cTime = new Date(j.completed_at || j.taken_at).getTime();
                    return cTime >= startOfDay.getTime() && cTime <= endOfDay.getTime();
                });
                
                dailyDeliveries.push({
                    label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
                    dateStr: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                    count: dayJobs.length
                });
            }

            summary.driver = {
                activeJobOrderId: activeJob ? activeJob.order_id.toString() : null,
                completedJobsCount,
                totalEarnings,
                dailyDeliveries
            };
        } else if (role === 'ADMIN') {
            const [usersCount, storesCount, productsCount, ordersCount] = await Promise.all([
                prisma.user.count(),
                prisma.store.count(),
                prisma.product.count(),
                prisma.order.count()
            ]);

            summary.admin = {
                usersCount,
                storesCount,
                productsCount,
                ordersCount
            };
        }

        res.status(200).json(summary);
    } catch (error) {
        handleError(res, error);
    }
};