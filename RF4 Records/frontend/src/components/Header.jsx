import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Info, Database, BookOpen, Trophy, Target, Calculator, Wine, Link, DollarSign, TreePine, Settings, Zap, Map, ChevronDown, Clock } from 'lucide-react';

const Header = ({ total, filtered, onRefresh, lastRefresh, darkMode, onToggleDarkMode, onAboutClick, currentPage, onPageChange }) => {
  // Check if we're in development/staging environment
  const isDevelopment = window.location.hostname !== 'rf4records.com';
  
  // Dropdown state for gear info and skill info
  const [gearDropdownOpen, setGearDropdownOpen] = useState(false);
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false);
  
  // Refs for dropdown containers
  const gearDropdownRef = useRef(null);
  const skillDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (gearDropdownRef.current && !gearDropdownRef.current.contains(event.target)) {
        setGearDropdownOpen(false);
      }
      if (skillDropdownRef.current && !skillDropdownRef.current.contains(event.target)) {
        setSkillDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatLastRefresh = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      
      <div className="mx-auto px-6 py-3">
        {/* Top Section - Title, Attribution, and Navigation */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-3">
          {/* Left Side - Title and Attribution with Dark Mode Toggle */}
          <div className="flex flex-col space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">RF4 Records</h1>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Created by ItsBlunty
                </span>
                
                {/* Dark Mode Toggle */}
                {onToggleDarkMode && (
                  <button
                    onClick={onToggleDarkMode}
                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {darkMode ? (
                      <Sun className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    ) : (
                      <Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Side - Navigation Buttons */}
          <div className="flex space-x-3 mt-4 lg:mt-0">
            <button
              onClick={() => onPageChange && onPageChange('links')}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                currentPage === 'links' 
                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' 
                  : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              <Link className="w-4 h-4 mr-2" />
              Links
            </button>
            
            <button
              onClick={() => onPageChange && onPageChange('records')}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                currentPage === 'records' 
                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' 
                  : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              <Database className="w-4 h-4 mr-2" />
              Records
            </button>


            <button
              onClick={() => onPageChange && onPageChange('waterbodyprices')}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                currentPage === 'waterbodyprices' 
                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' 
                  : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Waterbody Prices
            </button>

            {/* Skill Info Dropdown */}
            <div className="relative" ref={skillDropdownRef}>
              <button
                onClick={() => setSkillDropdownOpen(!skillDropdownOpen)}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  ['guides', 'skilltrees', 'lurecrafting'].includes(currentPage)
                    ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' 
                    : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
                }`}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Skill Info
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${skillDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {skillDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('guides');
                      setSkillDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg ${
                      currentPage === 'guides' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 inline mr-2" />
                    Skill Leveling Guides
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('skilltrees');
                      setSkillDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentPage === 'skilltrees' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <TreePine className="w-4 h-4 inline mr-2" />
                    Skill Trees
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('lurecrafting');
                      setSkillDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-lg ${
                      currentPage === 'lurecrafting' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Settings className="w-4 h-4 inline mr-2" />
                    Lure Crafting Recipes
                  </button>
                </div>
              )}
            </div>

            {/* Gear Info Dropdown */}
            <div className="relative" ref={gearDropdownRef}>
              <button
                onClick={() => setGearDropdownOpen(!gearDropdownOpen)}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  ['wearcalc', 'reelinfo', 'rodinfo'].includes(currentPage)
                    ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' 
                    : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                Gear Info
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${gearDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {gearDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('wearcalc');
                      setGearDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg ${
                      currentPage === 'wearcalc' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Calculator className="w-4 h-4 inline mr-2" />
                    Wear Calculator
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('reelinfo');
                      setGearDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentPage === 'reelinfo' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Settings className="w-4 h-4 inline mr-2" />
                    Reel Info
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('rodinfo');
                      setGearDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-lg ${
                      currentPage === 'rodinfo' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Zap className="w-4 h-4 inline mr-2" />
                    Rod Info
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => onPageChange && onPageChange('alcohol')}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                currentPage === 'alcohol' 
                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' 
                  : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              <Wine className="w-4 h-4 mr-2" />
              Alcohol
            </button>

            <button
              onClick={() => onPageChange && onPageChange('maps')}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                currentPage === 'maps' 
                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' 
                  : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              <Map className="w-4 h-4 mr-2" />
              Maps
            </button>

            <button
              onClick={() => onPageChange && onPageChange('timeline')}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                currentPage === 'timeline' 
                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' 
                  : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              <Clock className="w-4 h-4 mr-2" />
              Timeline
            </button>

            {onAboutClick && (
              <button
                onClick={onAboutClick}
                className="inline-flex items-center px-4 py-2 bg-gray-600 dark:bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <Info className="w-4 h-4 mr-2" />
                About RF4 Records
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 