import prisma from '../config/prisma.js';
import { handleError } from '../utils/errorHandler.js';

export const getWallet = async (req, res) => {
    try {
        let wallet = await prisma.wallet.findUnique({
            where: { user_id: req.userId }
        });

        if (!wallet) {
            wallet = await prisma.wallet.create({
                data: {
                    user_id: req.userId,
                    balance: 0.00
                }
            });
        }

        res.status(200).json(wallet);
    } catch (error) {
        handleError(res, error);
    }
};

export const getWalletTransactions = async (req, res) => {
    try {
        const wallet = await prisma.wallet.findUnique({
            where: { user_id: req.userId }
        });
        if (!wallet) return res.status(404).json({ msg: "Dompet tidak ditemukan" });

        const transactions = await prisma.walletTransaction.findMany({
            where: { wallet_id: wallet.id },
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json(transactions);
    } catch (error) {
        handleError(res, error);
    }
};

export const topupWallet = async (req, res) => {
    try {
        const amount = parseFloat(req.body.amount);
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ msg: "Jumlah top-up harus berupa angka positif dan lebih besar dari 0" });
        }

        const result = await prisma.$transaction(async (tx) => {
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

            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: amount } }
            });

            await tx.walletTransaction.create({
                data: {
                    wallet_id: wallet.id,
                    type: 'TOPUP',
                    amount,
                    description: "Top-up saldo dompet"
                }
            });

            return updatedWallet;
        }, {
            maxWait: 15000,
            timeout: 30000
        });

        res.status(200).json({ msg: "Top-up saldo berhasil", wallet: result });
    } catch (error) {
        handleError(res, error, 400);
    }
};
