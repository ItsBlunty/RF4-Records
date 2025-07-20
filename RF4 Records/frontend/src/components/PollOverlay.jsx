import React, { useState, useEffect } from 'react';
import { X, BarChart3, Users, CheckCircle } from 'lucide-react';

const PollOverlay = ({ isOpen, onClose }) => {
  const [poll, setPoll] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [userChoice, setUserChoice] = useState(null);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch poll data when overlay opens
  useEffect(() => {
    if (isOpen) {
      fetchPollData();
      checkVoteStatus();
    }
  }, [isOpen]);

  const fetchPollData = async () => {
    try {
      const response = await fetch('/api/poll/current');
      const data = await response.json();
      if (data.poll) {
        setPoll(data.poll);
      }
    } catch (error) {
      console.error('Error fetching poll:', error);
      setError('Failed to load poll');
    }
  };

  const checkVoteStatus = async () => {
    try {
      const response = await fetch('/api/poll/check-voted?poll_id=fishing_type_2025');
      const data = await response.json();
      if (data.has_voted) {
        setHasVoted(true);
        setUserChoice(data.choice);
        setShowResults(true);
        fetchResults();
      }
    } catch (error) {
      console.error('Error checking vote status:', error);
    }
  };

  const fetchResults = async () => {
    try {
      const response = await fetch('/api/poll/results?poll_id=fishing_type_2025');
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const submitVote = async () => {
    if (!selectedChoice) {
      setError('Please select an option');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/poll/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poll_id: 'fishing_type_2025',
          choice: selectedChoice
        })
      });

      const data = await response.json();

      if (response.ok) {
        setHasVoted(true);
        setUserChoice(selectedChoice);
        setShowResults(true);
        fetchResults();
      } else {
        setError(data.detail || 'Failed to submit vote');
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      setError('Failed to submit vote');
    } finally {
      setLoading(false);
    }
  };

  const toggleResults = () => {
    if (!showResults) {
      fetchResults();
    }
    setShowResults(!showResults);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Community Poll</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {poll ? (
            <>
              {/* Poll Question */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {poll.title}
                </h3>

                {/* Voting Section */}
                {!hasVoted && !showResults && (
                  <div className="space-y-3">
                    {poll.choices.map((choice) => (
                      <label
                        key={choice}
                        className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name="poll-choice"
                          value={choice}
                          checked={selectedChoice === choice}
                          onChange={(e) => setSelectedChoice(e.target.value)}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-900 dark:text-white">{choice}</span>
                      </label>
                    ))}

                    {error && (
                      <div className="text-red-600 dark:text-red-400 text-sm mt-2">
                        {error}
                      </div>
                    )}

                    <button
                      onClick={submitVote}
                      disabled={loading || !selectedChoice}
                      className="w-full mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Submitting...' : 'Submit Vote'}
                    </button>
                  </div>
                )}

                {/* Already Voted Message */}
                {hasVoted && !showResults && (
                  <div className="text-center py-4">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-900 dark:text-white font-medium">
                      Thank you for voting!
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Your choice: <span className="font-medium">{userChoice}</span>
                    </p>
                  </div>
                )}

                {/* Results Section */}
                {showResults && results && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2" />
                        Results
                      </h4>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4 mr-1" />
                        {results.total_votes} votes
                      </div>
                    </div>

                    <div className="space-y-3">
                      {results.results.map((result) => (
                        <div key={result.choice} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className={`text-sm font-medium ${
                              userChoice === result.choice 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {result.choice}
                              {userChoice === result.choice && (
                                <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                  Your vote
                                </span>
                              )}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {result.votes} ({result.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                userChoice === result.choice
                                  ? 'bg-blue-600 dark:bg-blue-500'
                                  : 'bg-gray-400 dark:bg-gray-500'
                              }`}
                              style={{ width: `${result.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Toggle Results Button */}
                {(hasVoted || results) && (
                  <button
                    onClick={toggleResults}
                    className="w-full mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {showResults ? 'Hide Results' : 'View Results'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading poll...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollOverlay;