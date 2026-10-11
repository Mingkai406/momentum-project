const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all mentees for a specific mentor
router.get('/:mentorId/mentees', async (req, res) => {
  try {
    const { mentorId } = req.params;
    
    const result = await pool.query(
      `SELECT ur.user_id, ur.email, ur.role, mm.created_at as relationship_since
       FROM mentor_mentee mm 
       JOIN user_roles ur ON mm.mentee_id = ur.user_id 
       WHERE mm.mentor_id = $1
       ORDER BY ur.email`,
      [mentorId]
    );
    
    res.json({
      success: true,
      count: result.rows.length,
      mentees: result.rows
    });
  } catch (error) {
    console.error('Error fetching mentees:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch mentees' 
    });
  }
});

// Get all goals for a specific mentee (for mentor to view)
router.get('/mentee/:menteeId/goals', async (req, res) => {
  try {
    const { menteeId } = req.params;
    
    const result = await pool.query(
      `SELECT g.*, 
              (SELECT COUNT(*) FROM action_steps WHERE goal_id = g.id AND is_completed = true) as completed_steps,
              (SELECT COUNT(*) FROM action_steps WHERE goal_id = g.id) as total_steps,
              (SELECT COUNT(*) FROM monthly_checkpoints WHERE goal_id = g.id AND is_completed = true) as completed_checkpoints,
              (SELECT COUNT(*) FROM monthly_checkpoints WHERE goal_id = g.id) as total_checkpoints
       FROM goals g 
       WHERE g.user_id = $1 
       ORDER BY g.goal_number`,
      [menteeId]
    );
    
    res.json({
      success: true,
      count: result.rows.length,
      goals: result.rows
    });
  } catch (error) {
    console.error('Error fetching mentee goals:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch mentee goals' 
    });
  }
});

// Get detailed information for a specific goal (including GROW, steps, checkpoints)
router.get('/goal/:goalId/details', async (req, res) => {
  try {
    const { goalId } = req.params;
    
    // Get goal basic info
    const goalResult = await pool.query(
      'SELECT * FROM goals WHERE id = $1',
      [goalId]
    );
    
    if (goalResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Goal not found' 
      });
    }
    
    // Get GROW analysis
    const growResult = await pool.query(
      'SELECT * FROM grow_analysis WHERE goal_id = $1',
      [goalId]
    );
    
    // Get action steps
    const stepsResult = await pool.query(
      'SELECT * FROM action_steps WHERE goal_id = $1 ORDER BY step_order',
      [goalId]
    );
    
    // Get checkpoints
    const checkpointsResult = await pool.query(
      'SELECT * FROM monthly_checkpoints WHERE goal_id = $1 ORDER BY created_at',
      [goalId]
    );
    
    // Get feedback
    const feedbackResult = await pool.query(
      `SELECT mf.*, ur.email as mentor_email 
       FROM mentor_feedback mf 
       JOIN user_roles ur ON mf.mentor_id = ur.user_id 
       WHERE mf.goal_id = $1 
       ORDER BY mf.created_at DESC`,
      [goalId]
    );
    
    res.json({
      success: true,
      goal: goalResult.rows[0],
      grow: growResult.rows[0] || null,
      steps: stepsResult.rows,
      checkpoints: checkpointsResult.rows,
      feedback: feedbackResult.rows
    });
  } catch (error) {
    console.error('Error fetching goal details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch goal details' 
    });
  }
});

// Add feedback to a mentee's goal
router.post('/feedback', async (req, res) => {
  try {
    const { goal_id, mentor_id, feedback_text } = req.body;
    
    const result = await pool.query(
      'INSERT INTO mentor_feedback (goal_id, mentor_id, feedback_text) VALUES ($1, $2, $3) RETURNING *',
      [goal_id, mentor_id, feedback_text]
    );
    
    res.status(201).json({
      success: true,
      feedback: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding feedback:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add feedback' 
    });
  }
});

// Get all feedback for a specific goal
router.get('/goal/:goalId/feedback', async (req, res) => {
  try {
    const { goalId } = req.params;
    
    const result = await pool.query(
      `SELECT mf.*, ur.email as mentor_email 
       FROM mentor_feedback mf 
       JOIN user_roles ur ON mf.mentor_id = ur.user_id 
       WHERE mf.goal_id = $1 
       ORDER BY mf.created_at DESC`,
      [goalId]
    );
    
    res.json({
      success: true,
      count: result.rows.length,
      feedback: result.rows
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch feedback' 
    });
  }
});

// Add mentor-mentee relationship
router.post('/relationship', async (req, res) => {
  try {
    const { mentor_id, mentee_id } = req.body;
    
    // Check if relationship already exists
    const existing = await pool.query(
      'SELECT id FROM mentor_mentee WHERE mentor_id = $1 AND mentee_id = $2',
      [mentor_id, mentee_id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Relationship already exists'
      });
    }
    
    const result = await pool.query(
      'INSERT INTO mentor_mentee (mentor_id, mentee_id) VALUES ($1, $2) RETURNING *',
      [mentor_id, mentee_id]
    );
    
    res.status(201).json({
      success: true,
      relationship: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating relationship:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create relationship' 
    });
  }
});

module.exports = router;
