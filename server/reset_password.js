const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
    console.error('Usage: node reset_password.js <username> <new_password>');
    process.exit(1);
}

const resetPassword = async () => {
    try {
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
            console.error(`User "${username}" not found.`);
            process.exit(1);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        console.log(`Password for user "${username}" has been reset successfully.`);
    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
};

resetPassword();
