import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ChevronRight, Search, Filter, X, Info, Star, Scale } from 'lucide-react';

const ItemInfo = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Item Information</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Choose a category to view detailed item specifications
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Lines Card */}
              <div 
                onClick={() => navigate('/iteminfo/lines')}
                className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Lines</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Complete fishing line specifications, ratings, and comparisons
                  </p>
                  <div className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium">
                    View Lines
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>

              {/* Lures Card */}
              <div 
                onClick={() => navigate('/iteminfo/lures')}
                className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-700 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-600 dark:bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Lures</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Lure specifications and effectiveness data (Coming Soon)
                  </p>
                  <div className="inline-flex items-center text-green-600 dark:text-green-400 font-medium">
                    View Lures
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemInfo;