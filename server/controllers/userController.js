const { body, validationResult } = require('express-validator');
const { query } = require('../db/config');
const logger = require('../utils/logger');
const { validationErrorHandler } = require('../middleware/errorHandler');

/**
 * Validation rules for creating user
 */
const createUserValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  body('role')
    .optional()
    .isIn(['trader', 'admin'])
    .withMessage('Role must be either trader or admin')
];

/**
 * Get all users (admin only)
 * GET /api/users
 */
async function getAllUsers(req, res) {
  try {
    const { status, role } = req.query;

    let queryText = 'SELECT id, email, first_name, last_name, role, status, last_login, created_at FROM users WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      queryText += ` AND status = $${params.length}`;
    }

    if (role) {
      params.push(role);
      queryText += ` AND role = $${params.length}`;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      users: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }))
    });
  } catch (error) {
    logger.error('Failed to get users', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users'
    });
  }
}

/**
 * Get user by ID
 * GET /api/users/:id
 */
async function getUserById(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, email, first_name, last_name, role, status, last_login, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    logger.error('Failed to get user', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user'
    });
  }
}

/**
 * Create user
 * POST /api/users
 */
async function createUser(req, res) {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(validationErrorHandler(errors));
    }

    const { email, firstName, lastName, role = 'trader' } = req.body;

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const result = await query(
      `INSERT INTO users (email, first_name, last_name, role, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, first_name, last_name, role, status, created_at`,
      [email.toLowerCase(), firstName || null, lastName || null, role, 'active']
    );

    const user = result.rows[0];

    // Log audit
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) 
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'CREATE_USER', 'user', user.id, JSON.stringify({ email: user.email })]
    );

    logger.info('User created', { email: user.email, createdBy: req.user.email });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    logger.error('Failed to create user', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
}

/**
 * Update user
 * PUT /api/users/:id
 */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, status } = req.body;

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (firstName !== undefined) {
      params.push(firstName);
      updates.push(`first_name = $${paramCount++}`);
    }

    if (lastName !== undefined) {
      params.push(lastName);
      updates.push(`last_name = $${paramCount++}`);
    }

    if (role && ['trader', 'admin'].includes(role)) {
      params.push(role);
      updates.push(`role = $${paramCount++}`);
    }

    if (status && ['active', 'suspended'].includes(status)) {
      params.push(status);
      updates.push(`status = $${paramCount++}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING id, email, first_name, last_name, role, status, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Log audit
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) 
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'UPDATE_USER', 'user', user.id, JSON.stringify(req.body)]
    );

    logger.info('User updated', { userId: user.id, updatedBy: req.user.email });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    logger.error('Failed to update user', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
}

/**
 * Delete user
 * DELETE /api/users/:id
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING email',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log audit
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) 
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'DELETE_USER', 'user', id, JSON.stringify({ email: result.rows[0].email })]
    );

    logger.info('User deleted', { userId: id, deletedBy: req.user.email });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete user', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
}

/**
 * Bulk create users from CSV/Excel data
 * POST /api/users/bulk
 */
async function bulkCreateUsers(req, res) {
  try {
    const { users } = req.body; // Array of user objects

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Users array is required'
      });
    }

    const results = {
      created: [],
      failed: [],
      duplicates: []
    };

    for (const userData of users) {
      try {
        const { email, firstName, lastName, role = 'trader' } = userData;

        if (!email) {
          results.failed.push({ email: 'missing', reason: 'Email is required' });
          continue;
        }

        // Check if user exists
        const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

        if (existing.rows.length > 0) {
          results.duplicates.push({ email, reason: 'User already exists' });
          continue;
        }

        // Create user
        const result = await query(
          `INSERT INTO users (email, first_name, last_name, role, status) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id, email`,
          [email.toLowerCase(), firstName || null, lastName || null, role, 'active']
        );

        results.created.push({ email: result.rows[0].email, id: result.rows[0].id });
      } catch (error) {
        results.failed.push({ email: userData.email, reason: error.message });
      }
    }

    // Log audit
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, details) 
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'BULK_CREATE_USERS', 'user', JSON.stringify(results)]
    );

    logger.info('Bulk user creation', {
      total: users.length,
      created: results.created.length,
      failed: results.failed.length,
      duplicates: results.duplicates.length,
      createdBy: req.user.email
    });

    res.json({
      success: true,
      message: 'Bulk user creation completed',
      results
    });
  } catch (error) {
    logger.error('Failed to bulk create users', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Failed to bulk create users'
    });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  bulkCreateUsers,
  createUserValidation
};
