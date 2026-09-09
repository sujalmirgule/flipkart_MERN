const sgMail = require('@sendgrid/mail');

const sendEmail = async (options) => {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_MAIL) {
        console.warn("[SendGrid Warning] SENDGRID_API_KEY or SENDGRID_MAIL is not configured. Email cannot be sent.");
        throw new Error("Email service is not configured on this server. Please contact administrator.");
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
        to: options.email,
        from: process.env.SENDGRID_MAIL,
        templateId: options.templateId,
        dynamic_template_data: options.data,
    };

    try {
        await sgMail.send(msg);
        console.log('[SendGrid] Email sent successfully to:', options.email);
    } catch (error) {
        console.error('[SendGrid Error]:', error.message);
        throw error;
    }
};

module.exports = sendEmail;