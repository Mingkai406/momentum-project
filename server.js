const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Import route modules
const usersRouter = require('./routes/users');
const goalsRouter = require('./routes/goals');
const mentorRouter = require('./routes/mentor');

// Use routes
app.use('/api/users', usersRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/mentor', mentorRouter);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'momentum-backend',
    version: '2.0.0',
    features: [
      'User role management',
      'Goal tracking with GROW framework',
      'Action steps management',
      'Monthly checkpoints',
      'Mentor-mentee relationships',
      'Mentor feedback system'
    ],
    database: 'PostgreSQL connected',
    timestamp: new Date().toISOString()
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Momentum API v2.0',
    endpoints: {
      users: {
        'POST /api/users/role': 'Create or update user role',
        'GET /api/users/:userId/role': 'Get user role information',
        'GET /api/users/:userId/profile': 'Get user profile with statistics'
      },
      goals: {
        'GET /api/goals/user/:userId': 'Get all goals for a user',
        'POST /api/goals': 'Create a new goal',
        'GET /api/goals/:goalId/grow': 'Get GROW analysis for a goal',
        'POST /api/goals/:goalId/grow': 'Save or update GROW analysis',
        'GET /api/goals/:goalId/steps': 'Get action steps for a goal',
        'POST /api/goals/:goalId/steps': 'Add a new action step',
        'PATCH /api/goals/steps/:stepId': 'Update action step completion',
        'GET /api/goals/:goalId/checkpoints': 'Get monthly checkpoints',
        'POST /api/goals/:goalId/checkpoints': 'Add or update checkpoint'
      },
      mentor: {
        'GET /api/mentor/:mentorId/mentees': 'Get all mentees for a mentor',
        'GET /api/mentor/mentee/:menteeId/goals': 'Get mentee goals (for mentor)',
        'GET /api/mentor/goal/:goalId/details': 'Get detailed goal information',
        'POST /api/mentor/feedback': 'Add feedback to a goal',
        'GET /api/mentor/goal/:goalId/feedback': 'Get all feedback for a goal',
        'POST /api/mentor/relationship': 'Create mentor-mentee relationship'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: 'Visit /api for available endpoints'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`Momentum Backend API v2.0`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Database: PostgreSQL`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================`);
});

module.exports = app;
