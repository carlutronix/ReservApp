export const sendEmail = async (options: { email: string; subject: string; message: string }) => {
    const apiKey = process.env.BREVO_API_KEY;
    
    if (!apiKey) {
        throw new Error('La variable BREVO_API_KEY no está configurada');
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            sender: { name: 'ReservApp', email: 'crey18119@gmail.com' },
            to: [{ email: options.email }],
            subject: options.subject,
            htmlContent: `<p>${options.message.replace(/\n/g, '<br>')}</p>`
        })
    });

    if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(errorData.message || 'Error al enviar el email por API de Brevo');
    }
};
