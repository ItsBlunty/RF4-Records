import React, { useState } from 'react';
import { MessageSquare, X, Send, AlertCircle } from 'lucide-react';

const FeedbackButton = ({ isOpen = false, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [formData, setFormData] = useState({
    type: 'feedback',
    subject: '',
    message: '',
    user_info: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      setSubmitStatus({ type: 'error', message: 'Please fill in subject and message' });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          page_url: window.location.href,
          subject: formData.subject.trim(),
          message: formData.message.trim(),
          user_info: formData.user_info.trim() || null
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitStatus({ type: 'success', message: result.message });
        setFormData({
          type: 'feedback',
          subject: '',
          message: '',
          user_info: ''
        });
        setTimeout(() => {
          if (onClose) onClose();
          setSubmitStatus(null);
        }, 2000);
      } else {
        setSubmitStatus({ type: 'error', message: result.detail || 'Failed to submit feedback' });
      }
    } catch (error) {
      setSubmitStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Send Feedback
              </h3>
              <button
                onClick={() => onClose && onClose()}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="feedback"
                      checked={formData.type === 'feedback'}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Feedback</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="issue"
                      checked={formData.type === 'issue'}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Issue/Bug</span>
                  </label>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Brief description..."
                  maxLength="200"
                  required
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formData.subject.length}/200 characters
                </div>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message *
                </label>
                <textarea
                  id="message"
                  rows="4"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe your feedback or issue in detail..."
                  maxLength="2000"
                  required
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formData.message.length}/2000 characters
                </div>
              </div>

              {/* User Info (Optional) */}
              <div>
                <label htmlFor="user_info" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Info (Optional)
                </label>
                <input
                  type="text"
                  id="user_info"
                  value={formData.user_info}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_info: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Email or username (optional)"
                  maxLength="100"
                />
              </div>

              {/* Status Messages */}
              {submitStatus && (
                <div className={`p-3 rounded-md flex items-center space-x-2 ${
                  submitStatus.type === 'success' 
                    ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300' 
                    : 'bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300'
                }`}>
                  {submitStatus.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                  <span className="text-sm">{submitStatus.message}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => onClose && onClose()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.subject.trim() || !formData.message.trim()}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;