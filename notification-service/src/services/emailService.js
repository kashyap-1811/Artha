const sgMail = require('@sendgrid/mail');
const dotenv = require('dotenv');

dotenv.config();

// Initialize the SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send an email through SendGrid.
 * 
 * @param {string} to - The recipient's email address
 * @param {string} subject - The email subject
 * @param {string} text - The plain text content
 * @param {string} html - The HTML content
 */
async function sendEmail(to, subject, text, html = null) {
    if (!process.env.SENDGRID_API_KEY) {
        console.warn('SENDGRID_API_KEY is not set. Email will not be sent.');
        return null;
    }

    const msg = {
        to: to,
        from: process.env.FROM_EMAIL || 'no-reply@example.com',
        subject: subject,
        text: text || "Artha Notification",
        html: html || text // Use HTML if provided, otherwise fallback to text
    };

    try {
        const response = await sgMail.send(msg);
        console.log(`Email sent successfully to ${to}`);
        return response;
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        
        // Output detailed SendGrid errors if available
        if (error.response) {
            console.error('SendGrid API Error body:', error.response.body);
        }
        
        throw error;
    }
}

module.exports = { sendEmail };
