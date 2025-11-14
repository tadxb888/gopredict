const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../db/config');
const { sendMagicLink } = require('./emailService');
const logger = require('../utils/logger');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const MAGIC_LINK_EXPIRES_IN = parseInt(process.env.MAGIC_LINK_EXPIRES_IN || '15'); // minutes

/**
 * Generate magic link token
 */
function generateMagicToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Request magic link login
 */
async function requestMagicLink(email) {
  try {
    // Check if user exists and is active
    const userResult = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      logger.logAuth('magic_link_request', email, false, 'user_not_found');
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    if (user.status !== 'active') {
      logger.logAuth('magic_link_request', email, false, 'user_suspended');
      throw new Error('User account is suspended');
    }

    // Generate magic link token
    const token = generateMagicToken();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRES_IN * 60 * 1000);

    // Store magic link in database
    await query(
      `INSERT INTO magic_links (email, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [email.toLowerCase(), token, expiresAt]
    );

    // Send magic link email
    await sendMagicLink(email, token, user.first_name);

    logger.logAuth('magic_link_sent', email, true);

    return {
      success: true,
      message: 'Magic link sent to your email'
    };
  } catch (error) {
    logger.error('Magic link request failed', { email, error: error.message });
    throw error;
  }
}

/**
 * Verify magic link token and create session
 */
async function verifyMagicLink(token, ipAddress, userAgent) {
  try {
    // Find magic link
    const linkResult = await query(
      `SELECT * FROM magic_links 
       WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
      [token]
    );

    if (linkResult.rows.length === 0) {
      logger.logAuth('magic_link_verify', 'unknown', false, 'invalid_or_expired_token');
      throw new Error('Invalid or expired magic link');
    }

    const magicLink = linkResult.rows[0];

    // Mark magic link as used
    await query(
      'UPDATE magic_links SET used = TRUE WHERE id = $1',
      [magicLink.id]
    );

    // Get user
    const userResult = await query(
      'SELECT * FROM users WHERE email = $1 AND status = $2',
      [magicLink.email, 'active']
    );

    if (userResult.rows.length === 0) {
      logger.logAuth('magic_link_verify', magicLink.email, false, 'user_not_found_or_inactive');
      throw new Error('User not found or inactive');
    }

    const user = userResult.rows[0];

    // Invalidate all existing sessions for this user (single session enforcement)
    await query(
      'DELETE FROM sessions WHERE user_id = $1',
      [user.id]
    );

    // Create new session token
    const sessionToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Store session in database
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await query(
      `INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, sessionToken, ipAddress, userAgent, expiresAt]
    );

    // Update user last login and session token
    await query(
      'UPDATE users SET last_login = NOW(), session_token = $1 WHERE id = $2',
      [sessionToken, user.id]
    );

    logger.logAuth('login_success', user.email, true);

    return {
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    };
  } catch (error) {
    logger.error('Magic link verification failed', { error: error.message });
    throw error;
  }
}

/**
 * Verify session token
 */
async function verifySession(token) {
  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if session exists and is valid
    const sessionResult = await query(
      `SELECT s.*, u.email, u.first_name, u.last_name, u.role, u.status, u.session_token
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Invalid session');
    }

    const session = sessionResult.rows[0];

    // Check if user is still active
    if (session.status !== 'active') {
      throw new Error('User account is suspended');
    }

    // Check if this is the current session (enforce single session)
    if (session.session_token !== token) {
      throw new Error('Session has been replaced by a newer login');
    }

    return {
      valid: true,
      user: {
        id: session.user_id,
        email: session.email,
        firstName: session.first_name,
        lastName: session.last_name,
        role: session.role
      }
    };
  } catch (error) {
    logger.error('Session verification failed', { error: error.message });
    return { valid: false, error: error.message };
  }
}

/**
 * Logout user
 */
async function logout(token) {
  try {
    // Delete session
    await query('DELETE FROM sessions WHERE token = $1', [token]);

    // Clear user session token
    const decoded = jwt.decode(token);
    if (decoded && decoded.id) {
      await query(
        'UPDATE users SET session_token = NULL WHERE id = $1',
        [decoded.id]
      );
    }

    logger.info('User logged out successfully');
    return { success: true };
  } catch (error) {
    logger.error('Logout failed', { error: error.message });
    throw error;
  }
}

/**
 * Clean up expired magic links and sessions
 */
async function cleanupExpired() {
  try {
    // Delete expired magic links
    const magicLinksResult = await query(
      'DELETE FROM magic_links WHERE expires_at < NOW() OR (used = TRUE AND created_at < NOW() - INTERVAL \'7 days\')'
    );

    // Delete expired sessions
    const sessionsResult = await query(
      'DELETE FROM sessions WHERE expires_at < NOW()'
    );

    logger.info('Cleanup completed', {
      magicLinksDeleted: magicLinksResult.rowCount,
      sessionsDeleted: sessionsResult.rowCount
    });
  } catch (error) {
    logger.error('Cleanup failed', { error: error.message });
  }
}

module.exports = {
  requestMagicLink,
  verifyMagicLink,
  verifySession,
  logout,
  cleanupExpired
};
