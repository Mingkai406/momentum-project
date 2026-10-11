const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all goals for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY goal_number',
      [userId]
    );
    res.json({
      success: true,
      count: result.rows.length,
      goals: result.rows
    });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch goals' 
    });
  }
});

// Create a new goal
router.post('/', async (req, res) => {
  try {
    const { user_id, goal_number, goal_title, goal_description, category } = req.body;
    
    const result = await pool.query(
      'INSERT INTO goals (user_id, goal_number, goal_title, goal_description, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, goal_number, goal_title, goal_description, category]
    );
    
    res.status(201).json({
      success: true,
      goal: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create goal' 
    });
  }
});

// Get GROW analysis for a specific goal
router.get('/:goalId/grow', async (req, res) => {
  try {
    const { goalId } = req.params;
    const result = await pool.query(
      'SELECT * FROM grow_analysis WHERE goal_id = $1',
      [goalId]
    );
    res.json({
      success: true,
      grow: result.rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching GROW analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch GROW analysis' 
    });
  }
});

// Save or update GROW analysis
router.post('/:goalId/grow', async (req, res) => {
  try {
    const { goalId } = req.params;
    const { goal_text, reality_text, options_text, will_text } = req.body;
    
    // Check if GROW analysis already exists
    const existing = await pool.query(
      'SELECT id FROM grow_analysis WHERE goal_id = $1',
      [goalId]
    );
    
    let result;
    if (existing.rows.length > 0) {
      // Update existing
      result = await pool.query(
        'UPDATE grow_analysis SET goal_text = $1, reality_text = $2, options_text = $3, will_text = $4, updated_at = CURRENT_TIMESTAMP WHERE goal_id = $5 RETURNING *',
        [goal_text, reality_text, options_text, will_text, goalId]
      );
    } else {
      // Insert new
      result = await pool.query(
        'INSERT INTO grow_analysis (goal_id, goal_text, reality_text, options_text, will_text) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [goalId, goal_text, reality_text, options_text, will_text]
      );
    }
    
    res.json({
      success: true,
      grow: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving GROW analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save GROW analysis' 
    });
  }
});

// Get action steps for a specific goal
router.get('/:goalId/steps', async (req, res) => {
  try {
    const { goalId } = req.params;
    const result = await pool.query(
      'SELECT * FROM action_steps WHERE goal_id = $1 ORDER BY step_order',
      [goalId]
    );
    res.json({
      success: true,
      count: result.rows.length,
      steps: result.rows
    });
  } catch (error) {
    console.error('Error fetching action steps:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch action steps' 
    });
  }
});

// Add a new action step
router.post('/:goalId/steps', async (req, res) => {
  try {
    const { goalId } = req.params;
    const { step_description, step_order } = req.body;
    
    const result = await pool.query(
      'INSERT INTO action_steps (goal_id, step_description, step_order) VALUES ($1, $2, $3) RETURNING *',
      [goalId, step_description, step_order]
    );
    
    res.status(201).json({
      success: true,
      step: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding action step:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add action step' 
    });
  }
});

// Update action step completion status
router.patch('/steps/:stepId', async (req, res) => {
  try {
    const { stepId } = req.params;
    const { is_completed } = req.body;
    
    const result = await pool.query(
      'UPDATE action_steps SET is_completed = $1, completed_at = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = $2 RETURNING *',
      [is_completed, stepId]
    );
    
    res.json({
      success: true,
      step: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating action step:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update action step' 
    });
  }
});

// Get monthly checkpoints for a goal
router.get('/:goalId/checkpoints', async (req, res) => {
  try {
    const { goalId } = req.params;
    const result = await pool.query(
      'SELECT * FROM monthly_checkpoints WHERE goal_id = $1 ORDER BY created_at',
      [goalId]
    );
    res.json({
      success: true,
      count: result.rows.length,
      checkpoints: result.rows
    });
  } catch (error) {
    console.error('Error fetching checkpoints:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch checkpoints' 
    });
  }
});

// Add or update monthly checkpoint
router.post('/:goalId/checkpoints', async (req, res) => {
  try {
    const { goalId } = req.params;
    const { month, checkpoint_description, progress_notes, is_completed } = req.body;
    
    // Check if checkpoint for this month already exists
    const existing = await pool.query(
      'SELECT id FROM monthly_checkpoints WHERE goal_id = $1 AND month = $2',
      [goalId, month]
    );
    
    let result;
    if (existing.rows.length > 0) {
      // Update existing
      result = await pool.query(
        'UPDATE monthly_checkpoints SET checkpoint_description = $1, progress_notes = $2, is_completed = $3, updated_at = CURRENT_TIMESTAMP WHERE goal_id = $4 AND month = $5 RETURNING *',
        [checkpoint_description, progress_notes, is_completed, goalId, month]
      );
    } else {
      // Insert new
      result = await pool.query(
        'INSERT INTO monthly_checkpoints (goal_id, month, checkpoint_description, progress_notes, is_completed) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [goalId, month, checkpoint_description, progress_notes, is_completed]
      );
    }
    
    res.json({
      success: true,
      checkpoint: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving checkpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save checkpoint' 
    });
  }
});

module.exports = router;
