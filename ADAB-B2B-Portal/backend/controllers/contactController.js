import { validationResult } from 'express-validator';
import pool from '../Config/database.js';

// Submit contact form
export const submitContactForm = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, phone, message } = req.body;
    const userId = req.user?.userId || null; // Optional authentication

    const query = `
      INSERT INTO manage_b_to_b_contact_submissions (
        user_id,
        name,
        email,
        phone,
        message,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await pool.query(query, [userId, name, email, phone, message]);

    res.status(201).json({
      success: true,
      message: 'Your message has been submitted successfully. We will get back to you soon.',
      data: {
        id: result.rows[0].id,
        created_at: result.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('Submit contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form'
    });
  }
};

// Get contact submissions (for authenticated users to see their own)
export const getMySubmissions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const query = `
      SELECT id, name, email, message, status, created_at
      FROM manage_b_to_b_contact_submissions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions'
    });
  }
};