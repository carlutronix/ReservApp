import nodemailer from 'nodemailer';

export const sendEmail = async (options: { email: string; subject: string; message: string }) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
        family: 4
    });

    const message = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: `<p>${options.message.replace(/\n/g, '<br>')}</p>`,
    };

    await transporter.sendMail(message);
};
