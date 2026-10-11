'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { userAPI, goalsAPI } from '@/lib/api';

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [goals, setGoals] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goal_title: '',
    goal_description: '',
    category: 'Work/School'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const cognitoUser = getCurrentUser();
      if (!cognitoUser) {
        router.push('/login');
        return;
      }

      cognitoUser.getSession(async (err: any, session: any) => {
        if (err || !session) {
          router.push('/login');
          return;
        }

        const userId = session.getIdToken().payload.sub;
        cognitoUser.getUserAttributes(async (err: any, attributes: any) => {
          if (!err && attributes) {
            const emailAttr = attributes.find((attr: any) => attr.Name === 'email');
            setUser({ id: userId, email: emailAttr?.Value });

            const [profileRes, goalsRes] = await Promise.all([
              userAPI.getProfile(userId),
              goalsAPI.getUserGoals(userId)
            ]);

            if (profileRes.success) {
              setProfile(profileRes);
              setUserRole(profileRes.user.role);
            }

            if (goalsRes.success) {
              setGoals(goalsRes.goals || []);
            }

            setLoading(false);
          }
        });
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleAddGoal = async () => {
    if (!newGoal.goal_title.trim()) {
      alert('Please enter a goal title');
      return;
    }

    try {
      const nextGoalNumber = goals.length + 1;
      const result = await goalsAPI.createGoal({
        user_id: user.id,
        goal_number: nextGoalNumber,
        goal_title: newGoal.goal_title,
        goal_description: newGoal.goal_description,
        category: newGoal.category
      });

      if (result.success) {
        setGoals([...goals, result.goal]);
        setShowAddGoal(false);
        setNewGoal({ goal_title: '', goal_description: '', category: 'Work/School' });
      }
    } catch (error) {
      console.error('Error adding goal:', error);
      alert('Failed to add goal');
    }
  };

  const handleLogout = () => {
    const cognitoUser = getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Momentum</h1>
              <span className="ml-4 text-sm text-gray-500">
                {userRole === 'mentor' ? 'My Personal Goals' : 'Student Dashboard'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {userRole === 'mentor' && (
                <button
                  onClick={() => router.push('/mentor/dashboard')}
                  className="px-4 py-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  ← Back to Mentor Dashboard
                </button>
              )}
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back! 👋
          </h2>
          <p className="text-gray-600">
            Track your goals and make progress every day
          </p>
        </div>

        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-2xl font-bold text-gray-900">
                {profile.stats.personal.total_goals}
              </div>
              <div className="text-sm text-gray-600">Total Goals</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-2xl font-bold text-gray-900">
                {profile.stats.personal.completed_steps}
              </div>
              <div className="text-sm text-gray-600">Completed Steps</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-2xl font-bold text-gray-900">
                {profile.stats.personal.total_steps > 0
                  ? Math.round((profile.stats.personal.completed_steps / profile.stats.personal.total_steps) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">My Goals</h3>
              <button
                onClick={() => setShowAddGoal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Goal
              </button>
            </div>
          </div>

          <div className="p-6">
            {goals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No goals yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start by adding your first goal to track your progress
                </p>
                <button
                  onClick={() => setShowAddGoal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Your First Goal
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/student/goals/${goal.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mr-3">
                            Goal {goal.goal_number}
                          </span>
                          <span className="text-xs text-gray-500">{goal.category}</span>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          {goal.goal_title}
                        </h4>
                        <p className="text-gray-600 text-sm">
                          {goal.goal_description}
                        </p>
                      </div>
                      <div className="ml-4 text-gray-400">→</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {showAddGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Add New Goal</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Goal Title *
                </label>
                <input
                  type="text"
                  value={newGoal.goal_title}
                  onChange={(e) => setNewGoal({ ...newGoal, goal_title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Get a co-op position"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newGoal.goal_description}
                  onChange={(e) => setNewGoal({ ...newGoal, goal_description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Describe your goal in detail..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Work/School">Work/School</option>
                  <option value="Home">Home</option>
                  <option value="Finances">Finances</option>
                  <option value="Relationships">Relationships</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowAddGoal(false);
                  setNewGoal({ goal_title: '', goal_description: '', category: 'Work/School' });
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGoal}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
