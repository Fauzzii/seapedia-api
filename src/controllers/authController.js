import prisma from "../config/index.js";
import bcrypt from "bcrypt";
import { handleError } from "../utils/errorHandler.js";

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                active_role: true,
                user_roles: {
                    include: { role: true }
                }
            }
        });
        if (!user) return res.status(404).json({ msg: "Email tidak terdaftar" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ msg: "Password salah" });

        req.session.userId = user.id.toString();
        req.session.role = user.active_role?.name || null;

        res.status(200).json({
            msg: "Login berhasil",
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            activeRole: user.active_role?.name || null,
            roles: user.user_roles.map(ur => ur.role.name)
        });
    } catch (error) {
        handleError(res, error);
    }
};

export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(400).json({ msg: "Gagal logout" });
        res.clearCookie('connect.sid');
        res.status(200).json({ msg: "Berhasil logout" });
    });
};

export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: BigInt(req.userId) },
            include: {
                active_role: true,
                user_roles: {
                    include: { role: true }
                }
            }
        });
        if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

        res.status(200).json({
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            activeRole: user.active_role?.name || null,
            roles: user.user_roles.map(ur => ur.role.name)
        });
    } catch (error) {
        handleError(res, error);
    }
};

export const selectRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) return res.status(400).json({ msg: "Role aktif wajib dipilih" });

        const user = await prisma.user.findUnique({
            where: { id: BigInt(req.userId) },
            include: {
                user_roles: {
                    include: { role: true }
                }
            }
        });

        if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

        let targetUserRole = user.user_roles.find(ur => ur.role.name === role);
        if (!targetUserRole) {
            const allowedRoles = ['BUYER', 'SELLER', 'DRIVER'];
            if (role === 'ADMIN' || !allowedRoles.includes(role)) {
                return res.status(403).json({ msg: `Anda tidak memiliki wewenang untuk role: ${role}` });
            }

            let dbRole = await prisma.role.findFirst({
                where: { name: role }
            });
            if (!dbRole) {
                dbRole = await prisma.role.create({
                    data: { name: role }
                });
            }

            await prisma.userRole.create({
                data: {
                    user_id: user.id,
                    role_id: dbRole.id
                }
            });

            targetUserRole = { role_id: dbRole.id };
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { active_role_id: targetUserRole.role_id }
        });
        req.session.role = role;

        res.status(200).json({
            msg: `Role aktif berhasil diubah menjadi ${role}`,
            activeRole: role
        });
    } catch (error) {
        handleError(res, error, 400);
    }
};

