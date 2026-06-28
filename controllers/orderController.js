import prisma from '../config/prisma.js';
import { handleError } from '../utils/errorHandler.js';
import { getCurrentTime } from '../utils/timeHelper.js';

export const getOrders = async (req, res) => {
    try {
        let response;
        if (req.role === 'ADMIN') {
            response = await prisma.order.findMany({
                include: { 
                    order_items: true, 
                    store: true, 
                    buyer: true,
                    order_status_histories: { orderBy: { created_at: 'asc' } }
                }
            });
        } else if (req.role === 'SELLER') {
            const store = await prisma.store.findFirst({
                where: { seller_id: req.userId }
            });
            if (!store) {
                return res.status(200).json([]);
            }
            response = await prisma.order.findMany({
                where: { store_id: store.id },
                include: { 
                    order_items: true, 
                    buyer: true,
                    order_status_histories: { orderBy: { created_at: 'asc' } }
                }
            });
        } else if (req.role === 'DRIVER') {
            response = await prisma.order.findMany({
                where: {
                    delivery_job: {
                        driver_id: req.userId
                    }
                },
                include: { 
                    order_items: true, 
                    store: true, 
                    buyer: true,
                    order_status_histories: { orderBy: { created_at: 'asc' } }
                }
            });
        } else {
            response = await prisma.order.findMany({
                where: { buyer_id: req.userId },
                include: { 
                    order_items: true, 
                    store: true,
                    order_status_histories: { orderBy: { created_at: 'asc' } },
                    delivery_job: true
                }
            });
        }
        res.status(200).json(response);
    } catch (error) {
        handleError(res, error);
    }
};

export const getOrderById = async (req, res) => {
    try {
        const orderId = BigInt(req.params.id);
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                order_items: true,
                order_status_histories: true,
                store: true,
                buyer: true,
                delivery_job: true
            }
        });

        if (!order) return res.status(404).json({ msg: "Pesanan tidak ditemukan" });

        const isBuyer = order.buyer_id === req.userId;
        const isSeller = order.store.seller_id === req.userId;
        const isDriver = order.delivery_job?.driver_id === req.userId;
        const isAdmin = req.role === 'ADMIN';

        if (!isBuyer && !isSeller && !isDriver && !isAdmin) {
            return res.status(403).json({ msg: "Anda tidak memiliki akses untuk melihat pesanan ini" });
        }

        res.status(200).json(order);
    } catch (error) {
        handleError(res, error);
    }
};

export const checkout = async (req, res) => {
    try {
        const { address_id, discountCode, voucher_code, promo_code, delivery_method } = req.body;
        const now = await getCurrentTime();

        const codeToValidate = discountCode || voucher_code || promo_code;

        const result = await prisma.$transaction(async (tx) => {
            const cart = await tx.cart.findUnique({
                where: { buyer_id: req.userId },
                include: {
                    cart_items: {
                        include: { product: true }
                    }
                }
            });

            if (!cart || cart.cart_items.length === 0) {
                throw new Error("Keranjang Anda kosong");
            }

            const address = await tx.address.findUnique({
                where: { id: BigInt(address_id) }
            });
            if (!address || address.buyer_id !== req.userId) {
                throw new Error("Alamat pengiriman tidak valid");
            }

            for (const item of cart.cart_items) {
                const updatedProduct = await tx.product.update({
                    where: { id: item.product_id },
                    data: { stock: { decrement: item.quantity } }
                });
                if (updatedProduct.stock < 0) {
                    throw new Error("Stok produk '" + item.product.name + "' tidak mencukupi (Tersedia: " + (updatedProduct.stock + item.quantity) + ")");
                }
            }

            let subtotal = 0;
            for (const item of cart.cart_items) {
                subtotal += parseFloat(item.product.price) * item.quantity;
            }

            let voucherId = null;
            let promoId = null;
            let totalDiscount = 0;

            if (codeToValidate) {
                const voucher = await tx.voucher.findUnique({
                    where: { code: codeToValidate }
                });

                if (voucher) {
                    if (new Date(voucher.expiry_date) < now) throw new Error("Voucher sudah kedaluwarsa");
                    if (voucher.remaining_usage <= 0) throw new Error("Voucher sudah habis digunakan");

                    if (voucher.discount_type === 'PERCENTAGE') {
                        totalDiscount = (parseFloat(voucher.discount_value) / 100) * subtotal;
                    } else {
                        totalDiscount = parseFloat(voucher.discount_value);
                    }
                    voucherId = voucher.id;

                    await tx.voucher.update({
                        where: { id: voucher.id },
                        data: { remaining_usage: voucher.remaining_usage - 1 }
                    });
                } else {
                    const promo = await tx.promo.findUnique({
                        where: { code: codeToValidate }
                    });
                    if (!promo) throw new Error("Kode diskon tidak valid");
                    if (new Date(promo.expiry_date) < now) throw new Error("Promo sudah kedaluwarsa");

                    if (promo.discount_type === 'PERCENTAGE') {
                        totalDiscount = (parseFloat(promo.discount_value) / 100) * subtotal;
                    } else {
                        totalDiscount = parseFloat(promo.discount_value);
                    }
                    promoId = promo.id;
                }
            }

            const netAmount = Math.max(0, subtotal - totalDiscount);

            let deliveryFee = 8000;
            if (delivery_method === 'INSTANT') deliveryFee = 20000;
            else if (delivery_method === 'NEXT_DAY') deliveryFee = 12000;

            const ppnAmount = netAmount * 0.12;

            const finalTotal = netAmount + deliveryFee + ppnAmount;

            let wallet = await tx.wallet.findUnique({
                where: { user_id: req.userId }
            });
            if (!wallet) {
                wallet = await tx.wallet.create({
                    data: {
                        user_id: req.userId,
                        balance: 0.00
                    }
                });
            }
            if (parseFloat(wallet.balance) < finalTotal) {
                throw new Error("Saldo dompet tidak mencukupi (Butuh: Rp" + finalTotal.toLocaleString() + ", Saldo Anda: Rp" + parseFloat(wallet.balance).toLocaleString() + ")");
            }

            const updatedWallet = await tx.wallet.update({
                where: { user_id: req.userId },
                data: { balance: { decrement: finalTotal } }
            });
            if (parseFloat(updatedWallet.balance) < 0) {
                throw new Error("Saldo dompet tidak mencukupi");
            }

            await tx.walletTransaction.create({
                data: {
                    wallet_id: wallet.id,
                    type: 'PAYMENT',
                    amount: finalTotal,
                    description: "Pembelian pesanan di toko ID " + cart.store_id
                }
            });

            let slaDuration = 3 * 24 * 60 * 60 * 1000;
            if (delivery_method === 'INSTANT') slaDuration = 3 * 60 * 60 * 1000;
            else if (delivery_method === 'NEXT_DAY') slaDuration = 24 * 60 * 60 * 1000;

            const expiredAt = new Date(now.getTime() + slaDuration);

            const newOrder = await tx.order.create({
                data: {
                    buyer_id: req.userId,
                    store_id: cart.store_id,
                    address_id: address.id,
                    voucher_id: voucherId,
                    promo_id: promoId,
                    shipping_recipient_name: address.recipient_name,
                    shipping_phone: address.phone,
                    shipping_address: address.address_detail,
                    delivery_method,
                    subtotal,
                    discount_amount: totalDiscount,
                    delivery_fee: deliveryFee,
                    ppn_amount: ppnAmount,
                    final_total: finalTotal,
                    status: 'PACKAGING',
                    expired_at: expiredAt
                }
            });

            for (const item of cart.cart_items) {
                const itemSubtotal = parseFloat(item.product.price) * item.quantity;
                await tx.orderItem.create({
                    data: {
                        order_id: newOrder.id,
                        product_id: item.product_id,
                        product_name: item.product.name,
                        price: item.product.price,
                        quantity: item.quantity,
                        subtotal: itemSubtotal
                    }
                });
            }

            await tx.orderStatusHistory.create({
                data: {
                    order_id: newOrder.id,
                    status: 'PACKAGING',
                    notes: "Pesanan berhasil dibuat, sedang dikemas oleh penjual."
                }
            });

            await tx.cartItem.deleteMany({
                where: { cart_id: cart.id }
            });
            await tx.cart.delete({
                where: { id: cart.id }
            });

            return newOrder;
        });

        res.status(201).json({ msg: "Checkout berhasil", order: result });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const orderId = BigInt(req.params.id);
        const { status, notes } = req.body;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { store: true }
        });
        if (!order) return res.status(404).json({ msg: "Pesanan tidak ditemukan" });

        const isSeller = order.store.seller_id === req.userId;
        const isAdmin = req.role === 'ADMIN';
        if (!isSeller && !isAdmin) {
            return res.status(403).json({ msg: "Anda tidak memiliki akses untuk mengubah status pesanan ini" });
        }

        const validStatuses = ['PACKAGING', 'WAITING_FOR_DRIVER', 'IN_DELIVERY', 'COMPLETED', 'RETURNED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ msg: "Status tidak valid" });
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            const result = await tx.order.update({
                where: { id: orderId },
                data: { status }
            });

            await tx.orderStatusHistory.create({
                data: {
                    order_id: orderId,
                    status,
                    notes: notes || `Status pesanan diubah ke ${status}`
                }
            });

            if (status === 'COMPLETED') {
                const deliveryJob = await tx.deliveryJob.findUnique({
                    where: { order_id: orderId }
                });
                if (deliveryJob && deliveryJob.status !== 'COMPLETED') {
                    await tx.deliveryJob.update({
                        where: { id: deliveryJob.id },
                        data: {
                            status: 'COMPLETED',
                            completed_at: await getCurrentTime()
                        }
                    });
                }
            }

            return result;
        });

        res.status(200).json({ msg: "Status pesanan berhasil diperbarui", order: updatedOrder });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const processOrder = async (req, res) => {
    try {
        const orderId = BigInt(req.params.id);

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { store: true }
        });
        if (!order) return res.status(404).json({ msg: "Pesanan tidak ditemukan" });

        if (order.store.seller_id !== req.userId) {
            return res.status(403).json({ msg: "Anda tidak memiliki akses untuk memproses pesanan ini" });
        }

        if (order.status !== 'PACKAGING') {
            return res.status(400).json({ msg: "Pesanan hanya dapat diproses dari status PACKAGING" });
        }

        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: { id: orderId },
                data: { status: 'WAITING_FOR_DRIVER' }
            });

            await tx.orderStatusHistory.create({
                data: {
                    order_id: orderId,
                    status: 'WAITING_FOR_DRIVER',
                    notes: "Pesanan selesai dikemas, menunggu kurir menjemput barang."
                }
            });

            const driverEarning = parseFloat(order.delivery_fee) * 0.8;
            await tx.deliveryJob.create({
                data: {
                    order_id: orderId,
                    earning: driverEarning,
                    status: 'AVAILABLE'
                }
            });

            return updated;
        });

        res.status(200).json({ msg: "Pesanan berhasil diproses, kurir siap menjemput", order: result });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const validateDiscount = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ msg: "Kode diskon wajib diisi" });

        const now = await getCurrentTime();

        const voucher = await prisma.voucher.findUnique({
            where: { code }
        });

        if (voucher) {
            const isExpired = new Date(voucher.expiry_date) < now;
            const isExhausted = voucher.remaining_usage <= 0;
            if (isExpired) return res.status(400).json({ msg: "Voucher sudah kedaluwarsa" });
            if (isExhausted) return res.status(400).json({ msg: "Kuota voucher sudah habis" });

            return res.status(200).json({
                msg: "Voucher valid",
                discountType: "VOUCHER",
                type: voucher.discount_type,
                value: parseFloat(voucher.discount_value),
                expiresAt: voucher.expiry_date
            });
        }

        const promo = await prisma.promo.findUnique({
            where: { code }
        });

        if (promo) {
            const isExpired = new Date(promo.expiry_date) < now;
            if (isExpired) return res.status(400).json({ msg: "Promo sudah kedaluwarsa" });

            return res.status(200).json({
                msg: "Promo valid",
                discountType: "PROMO",
                type: promo.discount_type,
                value: parseFloat(promo.discount_value),
                expiresAt: promo.expiry_date
            });
        }

        res.status(404).json({ msg: "Kode diskon tidak ditemukan" });
    } catch (error) {
        handleError(res, error);
    }
};

export const getSpendingReport = async (req, res) => {
    try {
        const buyerId = req.userId;
        const orders = await prisma.order.findMany({
            where: { buyer_id: buyerId },
            include: { order_items: true, store: true },
            orderBy: { created_at: 'desc' }
        });

        const totalSpending = orders
            .filter(o => o.status === 'COMPLETED')
            .reduce((sum, o) => sum + parseFloat(o.final_total), 0);

        const allTimeSpending = orders.reduce((sum, o) => sum + parseFloat(o.final_total), 0);

        res.status(200).json({
            totalSpending,
            allTimeSpending,
            ordersCount: orders.length,
            orders
        });
    } catch (error) {
        handleError(res, error);
    }
};

export const getIncomeReport = async (req, res) => {
    try {
        const sellerId = req.userId;
        const store = await prisma.store.findUnique({
            where: { seller_id: sellerId }
        });

        if (!store) {
            return res.status(400).json({ msg: "Anda tidak memiliki toko" });
        }

        const orders = await prisma.order.findMany({
            where: { store_id: store.id },
            include: { order_items: true },
            orderBy: { created_at: 'desc' }
        });

        const completedOrders = orders.filter(o => o.status === 'COMPLETED');
        const totalIncome = completedOrders.reduce((sum, o) => {
            return sum + (parseFloat(o.subtotal) - parseFloat(o.discount_amount));
        }, 0);

        res.status(200).json({
            totalIncome,
            ordersCount: orders.length,
            completedOrdersCount: completedOrders.length,
            orders
        });
    } catch (error) {
        handleError(res, error);
    }
};

export const verifySuccess = async (req, res) => {
    try {
        const orderId = BigInt(req.params.id);
        const buyerId = req.userId;
        const now = await getCurrentTime();

        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { delivery_job: true, store: true }
            });

            if (!order) throw new Error("Pesanan tidak ditemukan");
            if (order.buyer_id !== buyerId) throw new Error("Anda tidak berhak memverifikasi pesanan ini");
            if (order.status !== 'IN_DELIVERY') throw new Error("Pesanan tidak dalam status pengiriman");
            if (!order.delivery_job || order.delivery_job.status !== 'COMPLETED') {
                throw new Error("Kurir belum menyelesaikan pengantaran barang");
            }

            const updatedOrder = await tx.order.update({
                where: { id: orderId },
                data: { status: 'COMPLETED' }
            });

            await tx.orderStatusHistory.create({
                data: {
                    order_id: orderId,
                    status: 'COMPLETED',
                    notes: "Pembeli mengonfirmasi pesanan telah diterima dengan baik. Transaksi selesai."
                }
            });

            const driverId = order.delivery_job.driver_id;
            if (driverId) {
                let driverWallet = await tx.wallet.findUnique({ where: { user_id: driverId } });
                if (!driverWallet) {
                    driverWallet = await tx.wallet.create({ data: { user_id: driverId, balance: 0.00 } });
                }
                await tx.wallet.update({
                    where: { id: driverWallet.id },
                    data: { balance: { increment: order.delivery_job.earning } }
                });
                await tx.walletTransaction.create({
                    data: {
                        wallet_id: driverWallet.id,
                        type: 'TOPUP',
                        amount: order.delivery_job.earning,
                        description: `Pendapatan kurir untuk pengantaran pesanan ID ${orderId}`
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
                    description: `Pendapatan penjualan produk pesanan ID ${orderId}`
                }
            });

            return updatedOrder;
        });

        res.status(200).json({ msg: "Pesanan berhasil dikonfirmasi diterima.", order: result });
    } catch (error) {
        handleError(res, error, 400);
    }
};

export const verifyFailed = async (req, res) => {
    try {
        const orderId = BigInt(req.params.id);
        const buyerId = req.userId;
        const now = await getCurrentTime();

        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { delivery_job: true }
            });

            if (!order) throw new Error("Pesanan tidak ditemukan");
            if (order.buyer_id !== buyerId) throw new Error("Anda tidak berhak memverifikasi pesanan ini");
            if (order.status !== 'IN_DELIVERY') throw new Error("Pesanan tidak dalam status pengiriman");

            const updatedOrder = await tx.order.update({
                where: { id: orderId },
                data: { 
                    status: 'RETURNED',
                    returned_at: now
                }
            });

            await tx.orderStatusHistory.create({
                data: {
                    order_id: orderId,
                    status: 'RETURNED',
                    notes: "Pembeli melaporkan barang tidak sampai/hilang. Pengembalian dana penuh diproses otomatis."
                }
            });

            let buyerWallet = await tx.wallet.findUnique({ where: { user_id: buyerId } });
            if (!buyerWallet) {
                buyerWallet = await tx.wallet.create({ data: { user_id: buyerId, balance: 0.00 } });
            }
            await tx.wallet.update({
                where: { id: buyerWallet.id },
                data: { balance: { increment: order.final_total } }
            });
            await tx.walletTransaction.create({
                data: {
                    wallet_id: buyerWallet.id,
                    type: 'REFUND',
                    amount: order.final_total,
                    description: `Pengembalian dana pesanan ID ${orderId} (Barang tidak sampai)`
                }
            });

            return updatedOrder;
        });

        res.status(200).json({ msg: "Laporan kehilangan berhasil dikirim. Dana telah dikembalikan ke dompet Anda.", order: result });
    } catch (error) {
        handleError(res, error, 400);
    }
};
