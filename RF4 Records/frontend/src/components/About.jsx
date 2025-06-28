import React from 'react';

const About = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">About RF4 Records</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
            <p>
              This page was made by <span className="font-semibold text-blue-600 dark:text-blue-400">ItsBlunty</span> as 
              a learning and passion project for English speaking Russian Fishing 4 players.
            </p>
            
            <p>
              This page should always be updated any time locations, baits, or fish are added or changed.
            </p>
            
            <p>
              This site scrapes Russian Fishing 4 Records, including <span className="font-medium">Weekly Global</span>, 
              <span className="font-medium"> Ultralight</span>, <span className="font-medium">Light</span>, 
              <span className="font-medium"> Bottom Light</span>, and <span className="font-medium">Telescopic</span>. 
              The site updates automatically on a smart schedule that follows when players are most active: every 3 minutes 
              during peak times (Sunday 6PM to Tuesday 6PM UTC when weekly resets happen), every 30 minutes during moderate 
              activity (Tuesday 6PM to Thursday 6PM UTC), and every hour during quieter periods (Thursday 6PM to Sunday 6PM UTC).
            </p>
            
            <p>
              Please contact <span className="font-semibold text-blue-600 dark:text-blue-400">ItsBlunty</span> on 
              Discord with any issues or concerns.
            </p>
          </div>
          
          <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={onClose}
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About; 