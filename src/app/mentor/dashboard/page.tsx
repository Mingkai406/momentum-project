'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { userAPI, mentorAPI } from '@/lib/api';

export default function MentorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [mentees, setMentees] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [selectedMentee, setSelectedMentee] = useState<any>(null);
  const [menteeGoals, setMenteeGoals] = useState<any[]>([]);
  const [showAddMentee, setShowAddMentee] = useState(false);
  const [menteeEmail, setMenteeEmail] = useState('');
  const [addMenteeError, setAddMenteeError] = useState('');

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

            const [profileRes, menteesRes] = await Promise.all([
              userAPI.getProfile(userId),
              mentorAPI.getMentees(userId)
            ]);

            if (profileRes.success) {
              setProfile(profileRes);
            }

            if (menteesRes.success) {
              setMentees(menteesRes.mentees || []);
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

  const handleAddMentee = async () => {
    setAddMenteeError('');
    
    if (!menteeEmail.trim()) {
      setAddMenteeError('Please enter a mentee email');
      return;
    }

    try {
      // First, find the user by email
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/search-by-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: menteeEmail })
      });

      const result = await response.json();

      if (!result.success || !result.user) {
        setAddMenteeError('No user found with this email. Please check the email address.');
        return;
      }

      if (result.user.role !== 'student') {
        setAddMenteeError('This user is not a student.');
        return;
      }

      // Create relationship
      const relationshipResult = await mentorAPI.createRelationship(user.id, result.user.user_id);

      if (relationshipResult.success) {
        setShowAddMentee(false);
        setMenteeEmail('');
        loadData();
      } else {
        setAddMenteeError(relationshipResult.error || 'Failed to add mentee');
      }
    } catch (error: any) {
      console.error('Error adding mentee:', error);
      setAddMenteeError(error.message || 'Failed to add mentee');
    }
  };

  const handleViewMentee = async (mentee: any) => {
    setSelectedMentee(mentee);
    try {
      const result = await mentorAPI.getMenteeGoals(mentee.user_id);
      if (result.success) {
        setMenteeGoals(result.goals || []);
      }
    } catch (error) {
      console.error('Error loading mentee goals:', error);
    }
  };

  const handleLogout = () => {
    const cognitoUser = getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    router.push('/login');
  };

  const calculateProgress = (goal: any) => {
    if (goal.total_steps === 0) return 0;
    return Math.round((goal.completed_steps / goal.total_steps) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
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
              <h1 className="text-2xl font-bold text-purple-600">Momentum</h1>
              <span className="ml-4 text-sm text-gray-500">Mentor Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/student/dashboard')}
                className="px-4 py-2 text-sm text-purple-600 hover:text-purple-700"
              >
                My Goals
              </button>
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
            Mentor Dashboard 👨‍🏫
          </h2>
          <p className="text-gray-600">
            Guide your mentees and track their progress
          </p>
        </div>

        {profile && profile.stats.mentor && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-2xl font-bold text-gray-900">
                {profile.stats.mentor.total_mentees}
              </div>
              <div className="text-sm text-gray-600">Total Mentees</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl mb-2">💬</div>
              <div className="text-2xl font-bold text-gray-900">
                {profile.stats.mentor.total_feedback}
              </div>
              <div className="text-sm text-gray-600">Feedback Given</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-2xl font-bold text-gray-900">
                {profile.stats.personal.total_goals}
              </div>
              <div className="text-sm text-gray-600">My Personal Goals</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">My Mentees</h3>
                <button
                  onClick={() => setShowAddMentee(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  + Add Mentee
                </button>
              </div>
            </div>
            <div className="p-6">
              {mentees.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No mentees yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Add students to start mentoring
                  </p>
                  <button
                    onClick={() => setShowAddMentee(true)}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add Your First Mentee
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {mentees.map((mentee) => (
                    <div
                      key={mentee.user_id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedMentee?.user_id === mentee.user_id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                      }`}
                      onClick={() => handleViewMentee(mentee)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {mentee.email}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Since {new Date(mentee.relationship_since).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-purple-500">→</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedMentee ? `${selectedMentee.email}'s Goals` : 'Mentee Goals'}
              </h3>
            </div>
            <div className="p-6">
              {!selectedMentee ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👈</div>
                  <p className="text-gray-600">
                    Select a mentee to view their goals
                  </p>
                </div>
              ) : menteeGoals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎯</div>
                  <p className="text-gray-600">
                    This mentee has not set any goals yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {menteeGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/mentor/goals/${goal.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full mr-3">
                              Goal {goal.goal_number}
                            </span>
                            <span className="text-xs text-gray-500">{goal.category}</span>
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            {goal.goal_title}
                          </h4>
                          <p className="text-gray-600 text-sm mb-3">
                            {goal.goal_description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-600">
                            Steps: {goal.completed_steps}/{goal.total_steps}
                          </span>
                          <span className="text-gray-600">
                            Checkpoints: {goal.completed_checkpoints}/{goal.total_checkpoints}
                          </span>
                        </div>
                        {goal.total_steps > 0 && (
                          <div className="flex items-center">
                            <div className="w-32 h-2 bg-gray-200 rounded-full mr-2">
                              <div
                                className="h-2 bg-purple-600 rounded-full"
                                style={{ width: `${calculateProgress(goal)}%` }}
                              />
                            </div>
                            <span className="text-purple-600 font-semibold">
                              {calculateProgress(goal)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showAddMentee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Add Mentee</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Email Address
                </label>
                <input
                  type="email"
                  value={menteeEmail}
                  onChange={(e) => setMenteeEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="student@example.com"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter the email address of the student you want to mentor
                </p>
              </div>

              {addMenteeError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{addMenteeError}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowAddMentee(false);
                  setMenteeEmail('');
                  setAddMenteeError('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMentee}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Add Mentee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
