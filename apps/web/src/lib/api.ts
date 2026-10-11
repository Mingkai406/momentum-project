const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const userAPI = {
  setRole: async (userId: string, email: string, role: 'student' | 'mentor') => {
    const response = await fetch(`${API_URL}/api/users/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, email, role })
    });
    return response.json();
  },

  getRole: async (userId: string) => {
    const response = await fetch(`${API_URL}/api/users/${userId}/role`);
    return response.json();
  },

  getProfile: async (userId: string) => {
    const response = await fetch(`${API_URL}/api/users/${userId}/profile`);
    return response.json();
  }
};

export const goalsAPI = {
  getUserGoals: async (userId: string) => {
    const response = await fetch(`${API_URL}/api/goals/user/${userId}`);
    return response.json();
  },

  createGoal: async (goalData: any) => {
    const response = await fetch(`${API_URL}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalData)
    });
    return response.json();
  },

  getGROW: async (goalId: number) => {
    const response = await fetch(`${API_URL}/api/goals/${goalId}/grow`);
    return response.json();
  },

  saveGROW: async (goalId: number, growData: any) => {
    const response = await fetch(`${API_URL}/api/goals/${goalId}/grow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(growData)
    });
    return response.json();
  },

  getSteps: async (goalId: number) => {
    const response = await fetch(`${API_URL}/api/goals/${goalId}/steps`);
    return response.json();
  },

  addStep: async (goalId: number, stepData: any) => {
    const response = await fetch(`${API_URL}/api/goals/${goalId}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stepData)
    });
    return response.json();
  },

  updateStepCompletion: async (stepId: number, isCompleted: boolean) => {
    const response = await fetch(`${API_URL}/api/goals/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: isCompleted })
    });
    return response.json();
  }
};

export const mentorAPI = {
  getMentees: async (mentorId: string) => {
    const response = await fetch(`${API_URL}/api/mentor/${mentorId}/mentees`);
    return response.json();
  },

  getMenteeGoals: async (menteeId: string) => {
    const response = await fetch(`${API_URL}/api/mentor/mentee/${menteeId}/goals`);
    return response.json();
  },

  getGoalDetails: async (goalId: number) => {
    const response = await fetch(`${API_URL}/api/mentor/goal/${goalId}/details`);
    return response.json();
  },

  addFeedback: async (goalId: number, mentorId: string, feedbackText: string) => {
    const response = await fetch(`${API_URL}/api/mentor/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_id: goalId, mentor_id: mentorId, feedback_text: feedbackText })
    });
    return response.json();
  },

  createRelationship: async (mentorId: string, menteeId: string) => {
    const response = await fetch(`${API_URL}/api/mentor/relationship`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mentor_id: mentorId, mentee_id: menteeId })
    });
    return response.json();
  }
};
