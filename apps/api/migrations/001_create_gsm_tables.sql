-- User roles table to distinguish between students and mentors
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mentor-Mentee relationship mapping
CREATE TABLE IF NOT EXISTS mentor_mentee (
  id SERIAL PRIMARY KEY,
  mentor_id VARCHAR(255) NOT NULL,
  mentee_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mentor_id) REFERENCES user_roles(user_id),
  FOREIGN KEY (mentee_id) REFERENCES user_roles(user_id)
);

-- Goals table (Goal 1/2/3 or more, unlimited)
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  goal_number INTEGER NOT NULL,
  goal_title VARCHAR(500) NOT NULL,
  goal_description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_roles(user_id)
);

-- GROW analysis table (Goal, Reality, Options, Will)
CREATE TABLE IF NOT EXISTS grow_analysis (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL,
  goal_text TEXT,
  reality_text TEXT,
  options_text TEXT,
  will_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

-- Action steps to achieve goals
CREATE TABLE IF NOT EXISTS action_steps (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL,
  step_description TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

-- Monthly checkpoints for tracking progress
CREATE TABLE IF NOT EXISTS monthly_checkpoints (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL,
  month VARCHAR(20) NOT NULL,
  checkpoint_description TEXT,
  progress_notes TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

-- Mentor feedback on student goals
CREATE TABLE IF NOT EXISTS mentor_feedback (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL,
  mentor_id VARCHAR(255) NOT NULL,
  feedback_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  FOREIGN KEY (mentor_id) REFERENCES user_roles(user_id)
);
