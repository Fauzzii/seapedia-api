import prisma from "../config/index.js";

export const verifyUser = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ msg: "Mohon login ke akun Anda!" });
        }

        req.userId = BigInt(req.session.userId);

        if (req.session.role !== undefined) {
            req.role = req.session.role;
            return next();
        }

        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: { active_role: true }
        });
        if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

        req.role = user.active_role?.name || null;
        req.session.role = req.role;
        next();
    } catch (error) {
        res.status(500).json({ msg: "Autentikasi gagal, silakan coba lagi." });
    }
};

export const adminOnly = (req, res, next) => {
    if (req.role !== "ADMIN") {
        return res.status(403).json({ msg: "Akses terlarang! Khusus Admin." });
    }
    next();
};

export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.role)) {
            return res.status(403).json({ msg: "Akses ditolak! Anda tidak memiliki wewenang." });
        }
        next();
    };
};

export const requireActiveRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.role) {
            return res.status(403).json({ msg: "Akses ditolak! Silakan pilih role aktif terlebih dahulu." });
        }
        if (!allowedRoles.includes(req.role)) {
            return res.status(403).json({ msg: `Akses ditolak! Endpoint ini memerlukan role: ${allowedRoles.join(', ')}.` });
        }
        next();
    };
};