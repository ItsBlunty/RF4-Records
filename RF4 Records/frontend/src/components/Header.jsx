import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Info, Database, BookOpen, Trophy, Target, Calculator, Wine, Link, DollarSign, TreePine, Settings, Zap, Map, ChevronDown, Clock, GamepadIcon, HelpCircle, MessageCircle, FileImage, Coffee, Menu, X, Vote } from 'lucide-react';
import FeedbackButton from './FeedbackButton.jsx';
import PollOverlay from './PollOverlay.jsx';

const Header = ({ total, filtered, onRefresh, lastRefresh, darkMode, onToggleDarkMode, onAboutClick, currentPage, onPageChange }) => {
  // Feedback modal state
  const [showFeedback, setShowFeedback] = useState(false);
  // Poll modal state
  const [showPoll, setShowPoll] = useState(false);
  // Check if we're in development/staging environment
  const isDevelopment = window.location.hostname !== 'rf4records.com';
  
  // Dropdown state for gear info, skill info, and game info
  const [gearDropdownOpen, setGearDropdownOpen] = useState(false);
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false);
  const [gameInfoDropdownOpen, setGameInfoDropdownOpen] = useState(false);
  
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Refs for dropdown containers
  const gearDropdownRef = useRef(null);
  const skillDropdownRef = useRef(null);
  const gameInfoDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (gearDropdownRef.current && !gearDropdownRef.current.contains(event.target)) {
        setGearDropdownOpen(false);
      }
      if (skillDropdownRef.current && !skillDropdownRef.current.contains(event.target)) {
        setSkillDropdownOpen(false);
      }
      if (gameInfoDropdownRef.current && !gameInfoDropdownRef.current.contains(event.target)) {
        setGameInfoDropdownOpen(false);
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
      
      <div className="mx-auto px-4 sm:px-6 py-3">
        {/* Top Section - Title, Attribution, and Navigation */}
        <div className="flex items-center justify-between">
          {/* Left Side - Title and Attribution with Dark Mode Toggle */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">RF4 Records</h1>
            
            {/* Poll Title - Clickable */}
            <button
              onClick={() => setShowPoll(true)}
              className="hidden md:flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
              title="What type of fishing would you like to see added to RF4?"
            >
              <Vote className="w-4 h-4 mr-2" />
              <span>POLL: Fishing Types</span>
            </button>
            
            <div className="hidden sm:flex items-center space-x-3">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 sm:px-3 py-1 rounded-full">
                Created by ItsBlunty
              </span>
              
              {/* Feedback Button */}
              <button
                onClick={() => setShowFeedback(true)}
                className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                title="Submit Feedback or Report Issue"
              >
                Submit Feedback
              </button>
              
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
          
          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>
          
          {/* Desktop Navigation Buttons */}
          <div className="hidden lg:flex space-x-3">
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
              onClick={() => onPageChange && onPageChange('trophyweights')}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                currentPage === 'trophyweights'
                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800'
                  : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Trophy Weights
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

            {/* Game Info Dropdown */}
            <div className="relative" ref={gameInfoDropdownRef}>
              <button
                onClick={() => setGameInfoDropdownOpen(!gameInfoDropdownOpen)}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  ['waterbodyprices', 'timeline', 'alcohol', 'qa', 'cafeorders'].includes(currentPage)
                    ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' 
                    : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
                }`}
              >
                <GamepadIcon className="w-4 h-4 mr-2" />
                Game Info
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${gameInfoDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {gameInfoDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('waterbodyprices');
                      setGameInfoDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg ${
                      currentPage === 'waterbodyprices' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 inline mr-2" />
                    Waterbody Prices
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('timeline');
                      setGameInfoDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentPage === 'timeline' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Clock className="w-4 h-4 inline mr-2" />
                    Update History
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('alcohol');
                      setGameInfoDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentPage === 'alcohol' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Wine className="w-4 h-4 inline mr-2" />
                    Alcohol
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('qa');
                      setGameInfoDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentPage === 'qa' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 inline mr-2" />
                    Dev FAQ
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('cafeorders');
                      setGameInfoDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-lg ${
                      currentPage === 'cafeorders' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Coffee className="w-4 h-4 inline mr-2" />
                    Cafe Orders
                  </button>
                </div>
              )}
            </div>

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
                  ['wearcalc', 'reelinfo', 'rodinfo', 'iteminfo', 'lines', 'lures'].includes(currentPage)
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
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentPage === 'rodinfo' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Zap className="w-4 h-4 inline mr-2" />
                    Rod Info
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Item Info
                  </div>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('lines');
                      setGearDropdownOpen(false);
                    }}
                    className={`w-full text-left px-6 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentPage === 'lines' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Settings className="w-4 h-4 inline mr-2" />
                    Lines
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('lures');
                      setGearDropdownOpen(false);
                    }}
                    className={`w-full text-left px-6 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-lg ${
                      currentPage === 'lures' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Settings className="w-4 h-4 inline mr-2" />
                    Lures
                  </button>
                </div>
              )}
            </div>

            {onAboutClick && (
              <button
                onClick={onAboutClick}
                className="inline-flex items-center px-4 py-2 bg-gray-600 dark:bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                About
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            {/* Mobile Attribution and Dark Mode Toggle */}
            <div className="flex items-center justify-between mb-4 sm:hidden">
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                Created by ItsBlunty
              </span>
              
              {/* Mobile Poll Button */}
              <button
                onClick={() => setShowPoll(true)}
                className="px-2 py-1 text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
                title="POLL: Fishing Types"
              >
                Poll
              </button>
              
              {/* Mobile Feedback Button */}
              <button
                onClick={() => setShowFeedback(true)}
                className="px-2 py-1 text-xs bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                title="Submit Feedback or Report Issue"
              >
                Feedback
              </button>
              
              {/* Mobile Dark Mode Toggle */}
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
            
            {/* Mobile Navigation Links */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  onPageChange && onPageChange('links');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === 'links' 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Link className="w-4 h-4 mr-3" />
                Links
              </button>
              
              <button
                onClick={() => {
                  onPageChange && onPageChange('records');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === 'records'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Database className="w-4 h-4 mr-3" />
                Records
              </button>

              <button
                onClick={() => {
                  onPageChange && onPageChange('trophyweights');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === 'trophyweights'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Trophy className="w-4 h-4 mr-3" />
                Trophy Weights
              </button>

              <button
                onClick={() => {
                  onPageChange && onPageChange('maps');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === 'maps' 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Map className="w-4 h-4 mr-3" />
                Maps
              </button>

              {/* Game Info Section */}
              <div className="py-2">
                <div className="flex items-center px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <GamepadIcon className="w-4 h-4 mr-2" />
                  Game Info
                </div>
                <div className="ml-6 space-y-1">
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('waterbodyprices');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === 'waterbodyprices' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 mr-3" />
                    Waterbody Prices
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('timeline');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === 'timeline' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Clock className="w-4 h-4 mr-3" />
                    Update History
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('alcohol');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === 'alcohol' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Wine className="w-4 h-4 mr-3" />
                    Alcohol
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('qa');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === 'qa' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 mr-3" />
                    Dev FAQ
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('cafeorders');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === 'cafeorders' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Coffee className="w-4 h-4 mr-3" />
                    Cafe Orders
                  </button>
                </div>
              </div>

              {/* Skill Info Section */}
              <div className="py-2">
                <div className="flex items-center px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Skill Info
                </div>
                <div className="ml-6 space-y-1">
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('guides');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === 'guides' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 mr-3" />
                    Skill Leveling Guides
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('skilltrees');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === 'skilltrees' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <TreePine className="w-4 h-4 mr-3" />
                    Skill Trees
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('lurecrafting');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === 'lurecrafting' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Lure Crafting Recipes
                  </button>
                </div>
              </div>

              {/* Gear Info Section */}
              <div className="py-2">
                <div className="flex items-center px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <Settings className="w-4 h-4 mr-2" />
                  Gear Info
                </div>
                <div className="ml-6 space-y-1">
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('wearcalc');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === 'wearcalc' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Calculator className="w-4 h-4 mr-3" />
                    Wear Calculator
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('reelinfo');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === 'reelinfo' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Reel Info
                  </button>
                  <button
                    onClick={() => {
                      onPageChange && onPageChange('rodinfo');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === 'rodinfo' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Zap className="w-4 h-4 mr-3" />
                    Rod Info
                  </button>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Item Info
                  </div>
                  <div className="ml-3 space-y-1">
                    <button
                      onClick={() => {
                        onPageChange && onPageChange('lines');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                        currentPage === 'lines' 
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Lines
                    </button>
                    <button
                      onClick={() => {
                        onPageChange && onPageChange('lures');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                        currentPage === 'lures' 
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Lures
                    </button>
                  </div>
                </div>
              </div>

              {/* About Button */}
              {onAboutClick && (
                <button
                  onClick={() => {
                    onAboutClick();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 mr-3" />
                  About
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Feedback Modal */}
        {showFeedback && (
          <FeedbackButton isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
        )}
        
        {/* Poll Modal */}
        {showPoll && (
          <PollOverlay isOpen={showPoll} onClose={() => setShowPoll(false)} />
        )}
      </div>
    </header>
  );
};

export default Header; 