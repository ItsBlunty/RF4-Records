import React from 'react';

const Lures = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lures</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Complete lure specifications and statistics
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-12">
            <div className="text-center">
              <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🎣</div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Coming Soon
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Lure information and specifications will be available here soon. 
                This section is currently under development.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lures;