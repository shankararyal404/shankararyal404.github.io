import nodemailer from 'nodemailer';
import UAParser from 'ua-parser-js';

import { checkRateLimit } from '../lib/rateLimit.js';

// Rate limiting settings
const MAX_REQUESTS = 3;
const BLOCK_TIME = 60 * 1000; // 1 minute

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { name, email, message } = req.body;

    // Collect additional information (Note: Keep this section for your own record)
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const referer = req.headers['referer'] || 'No referer';
    const origin = req.headers['origin'] || 'No origin';
    const parser = new UAParser(userAgent);
    const browserInfo = parser.getBrowser();
    const osInfo = parser.getOS();
    const deviceInfo = parser.getDevice();
    const timeOfSubmission = new Date().toISOString();

    // Rate-limiting check
    const key = `${ip}-${browserInfo.name}-${deviceInfo.model || 'Unknown Device'}`;
    const isRequestAllowed = checkRateLimit(key, MAX_REQUESTS, BLOCK_TIME);
    if (!isRequestAllowed) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    // Set up email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    // 1. Email options for YOU (shankararyal737@gmail.com)
    const mailOptionsToMe = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO || 'shankararyal404@gmail.com',
      subject: '📬 New Contact Form Submission from ' + name,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px; border: 1px solid #eee; background-color: #f9f9f9;">
          <h2 style="color: #2b79c2; border-bottom: 2px solid #2b79c2; padding-bottom: 10px;">📧 New Contact Form Submission</h2>
          
          <div style="padding: 10px 0;">
            <p><strong style="color: #333;">Name:</strong> <span style="color: #555;">${name}</span></p>
            <p><strong style="color: #333;">Email:</strong> <span style="color: #555;">${email}</span></p>
            <p><strong style="color: #333;">Message:</strong></p>
            <p style="color: #555; background-color: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
              ${message}
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

          <h3 style="color: #2b79c2; border-bottom: 2px solid #2b79c2; padding-bottom: 10px;">📋 Additional Information</h3>

          <div style="padding: 10px 0;">
            <p><strong style="color: #333;">IP Address:</strong> <span style="color: #555;">${ip}</span></p>
            <p><strong style="color: #333;">Browser:</strong> <span style="color: #555;">${browserInfo.name} ${browserInfo.version}</span></p>
            <p><strong style="color: #333;">Operating System:</strong> <span style="color: #555;">${osInfo.name} ${osInfo.version}</span></p>
            <p><strong style="color: #333;">Device:</strong> <span style="color: #555;">${deviceInfo.vendor || 'Unknown Vendor'} ${deviceInfo.model || 'Unknown Model'} ${deviceInfo.type || 'Unknown Type'}</span></p>
            <p><strong style="color: #333;">User Agent:</strong> <span style="color: #555;">${userAgent}</span></p>
            <p><strong style="color: #333;">Referer:</strong> <span style="color: #555;">${referer}</span></p>
            <p><strong style="color: #333;">Origin:</strong> <span style="color: #555;">${origin}</span></p>
            <p><strong style="color: #333;">Time of Submission:</strong> <span style="color: #555;">${timeOfSubmission}</span></p>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

          <p style="text-align: center; margin-top: 20px;">
            <strong style="color: #2b79c2;">your Website Team -Shankar Aryal</strong><br>
            <a href="${process.env.SITE_URL || 'https://www.shankararyal404.com.np/'}" style="color: #2b79c2; text-decoration: none;">Visit our website</a>
          </p>
        </div>
      `,
    };

    // 2. Email options for the USER (the person who submitted the form)
    // NOTE: Generating a simple token. For a real system, this token should be unique and trackable.
    const submissionToken = Math.random().toString(36).substring(2, 10).toUpperCase();

    const mailOptionsToUser = {
      from: process.env.EMAIL_USER,
      to: email, // Sending to the submitted email address
      subject: '✅ Contact Form Submission Received - Shankar Aryal',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px; border: 1px solid #ddd; background-color: #f7f7f7;">
          <h2 style="color: #008000; border-bottom: 2px solid #008000; padding-bottom: 10px;">👋 Thank You for Contacting Shankar Aryal!</h2>
          
          <p>Dear ${name},</p>
          <p>Thank you for submitting your contact form. We have successfully received your message and appreciate you reaching out!</p>

          <div style="background-color: #e0f7e0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong style="color: #008000;">Submission Token:</strong> <span style="color: #555;">${submissionToken}</span></p>
            <p><strong style="color: #008000;">Your Message Summary:</strong> <span style="color: #555;">"${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"</span></p>
          </div>

          <p><strong>Shankar Aryal will reply to you and contact you as soon as possible.</strong></p>
          <p>In case of no reply within **24 hours**, please feel free to contact him directly via his personal social media accounts listed below:</p>

          <h3 style="color: #2b79c2;">Connect Directly:</h3>
          <ul style="list-style-type: none; padding: 0;">
            <li>➡️ <a href="https://www.instagram.com/mrshankararyal/" style="color: #2b79c2; text-decoration: none;">Instagram</a></li>
            <li>➡️ <a href="https://www.facebook.com/ShankarAryal01" style="color: #2b79c2; text-decoration: none;">Facebook</a></li>
            <li>➡️ <a href="www.linkedin.com/in/shankararyal" style="color: #2b79c2; text-decoration: none;">LinkedIn</a></li>
            <li>➡️ <a href="https://github.com/MrShankarAryal" style="color: #2b79c2; text-decoration: none;">GitHub</a></li>
            <li>➡️ <a href="https://dev.to/shankararyal" style="color: #2b79c2; text-decoration: none;">Dev.to</a></li>
            <li>➡️ <a href="https://www.researchgate.net/profile/Shankar-Aryal-2?ev=hdr_xprf" style="color: #2b79c2; text-decoration: none;">ResearchGate</a></li>
            <li>➡️ <a href="https://scholar.google.com/citations?user=rf8xZhQAAAAJ&hl=en" style="color: #2b79c2; text-decoration: none;">Google Scholar</a></li>
          </ul>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="text-align: center; font-size: 0.9em; color: #777;">
            This is an automated confirmation email.
            <br>
            <a href="${process.env.SITE_URL || 'https://www.shankararyal404.com.np/'}" style="color: #2b79c2; text-decoration: none;">Visit Shankar Aryal's Website</a>
          </p>
        </div>
      `,
    };

    try {
      // 1. Send email to yourself
      console.log('Sending email to self...');
      await transporter.sendMail(mailOptionsToMe);
      console.log('Email sent to self successfully.');

      // 2. Send confirmation email to the user
      console.log('Sending confirmation email to user...');
      await transporter.sendMail(mailOptionsToUser);
      console.log('Confirmation email sent to user successfully.');

      res.status(200).json({
        message: 'Form submission successful. Thank you for your message. A confirmation email has been sent to your address.',
        submissionToken: submissionToken // Optionally include the token in the response
      });
    } catch (error) {
      console.error('Error sending email:', error.message);
      res.status(500).json({ message: 'Error sending one or both emails' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
