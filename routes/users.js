const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.post('/role', async (req, res) => {
  try {
    const { user_id, email, role } = req.body;
    
    if (!['student', 'mentor'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role must be either "student" or "mentor"'
      });
    }
    
    const existing = await pool.query(
      'SELECT id FROM user_roles WHERE user_id = $1',
      [user_id]
    );
    
    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        'UPDATE user_roles SET email = $1, role = $2 WHERE user_id = $3 RETURNING *',
        [email, role, user_id]
      );
    } else {
      result = await pool.query(
        'INSERT INTO user_roles (user_id, email, role) VALUES ($1, $2, $3) RETURNING *',
        [user_id, email, role]
      );
    }
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error setting user role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set user role'
    });
  }
});

router.get('/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM user_roles WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user role'
    });
  }
});

router.post('/search-by-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const result = await pool.query(
      'SELECT * FROM user_roles WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.json({
        success: false,
        error: 'No user found with this email'
      });
    }
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error searching user by email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search user'
    });
  }
});

router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userResult = await pool.query(
      'SELECT * FROM user_roles WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    const goalsResult = await pool.query(
      'SELECT COUNT(*) as total_goals FROM goals WHERE user_id = $1',
      [userId]
    );
    
    const stepsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_steps,
        SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed_steps
       FROM action_steps 
       WHERE goal_id IN (SELECT id FROM goals WHERE user_id = $1)`,
      [userId]
    );
    
    let stats = {
      personal: {
        total_goals: parseInt(goalsResult.rows[0].total_goals),
        total_steps: parseInt(stepsResult.rows[0].total_steps || 0),
        completed_steps: parseInt(stepsResult.rows[0].completed_steps || 0)
      }
    };
    
    if (user.role === 'mentor') {
      const menteesResult = await pool.query(
        'SELECT COUNT(*) as total_mentees FROM mentor_mentee WHERE mentor_id = $1',
        [userId]
      );
      
      const feedbackResult = await pool.query(
        'SELECT COUNT(*) as total_feedback FROM mentor_feedback WHERE mentor_id = $1',
        [userId]
      );
      
      stats.mentor = {
        total_mentees: parseInt(menteesResult.rows[0].total_mentees),
        total_feedback: parseInt(feedbackResult.rows[0].total_feedback)
      };
    }
    
    res.json({
      success: true,
      user: user,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

module.exports = router;
