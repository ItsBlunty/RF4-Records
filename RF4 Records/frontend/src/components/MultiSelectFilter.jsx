import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, HelpCircle } from 'lucide-react';

const MultiSelectFilter = ({
  label,
  placeholder,
  values = [],
  selectedValues = [],
  onChange,
  className = ''
}) => {  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredValues, setFilteredValues] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showTooltip, setShowTooltip] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const tooltipRef = useRef(null);

  // Filter available values based on input and exclude already selected
  useEffect(() => {
    const availableValues = values.filter(value => !selectedValues.includes(value));

    if (!inputValue.trim()) {
      // When no input, show all available values sorted alphabetically
      const sorted = [...availableValues].sort((a, b) => a.localeCompare(b));
      setFilteredValues(sorted);
      // Don't auto-close dropdown when input is cleared - let click handlers manage this
      return;
    }

    const filtered = availableValues
      .filter(value =>
        value.toLowerCase().includes(inputValue.toLowerCase())
      )
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const inputLower = inputValue.toLowerCase();

        // Prioritize exact matches first
        const aExact = aLower === inputLower;
        const bExact = bLower === inputLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Then prioritize matches that start with the input
        const aStarts = aLower.startsWith(inputLower);
        const bStarts = bLower.startsWith(inputLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // Finally, sort alphabetically
        return a.localeCompare(b);
      }); // No limit - show all matching suggestions with scrolling
    setFilteredValues(filtered);
    setIsOpen(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [inputValue, values, selectedValues]);

  // Close dropdown and tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      let valueToAdd = null;

      if (highlightedIndex >= 0 && filteredValues[highlightedIndex]) {
        // Select highlighted option
        valueToAdd = filteredValues[highlightedIndex];
      } else if (inputValue.trim()) {
        // If there's an exact match, use it; otherwise, use the input value
        const exactMatch = values.find(v =>
          v.toLowerCase() === inputValue.toLowerCase() &&
          !selectedValues.includes(v)
        );
        valueToAdd = exactMatch || inputValue.trim();
      }

      if (valueToAdd && !selectedValues.includes(valueToAdd)) {
        // Add the value - onChange will trigger auto-search in parent
        const newValues = [...selectedValues, valueToAdd];
        setInputValue('');
        setIsOpen(false);
        setHighlightedIndex(-1);
        onChange(newValues);
      }
    } else if (e.key === 'Tab') {
      if (inputValue.trim()) {
        e.preventDefault();
        // Add current input as a bubble on Tab - onChange will trigger auto-search
        const exactMatch = values.find(v =>
          v.toLowerCase() === inputValue.toLowerCase() &&
          !selectedValues.includes(v)
        );
        const valueToAdd = exactMatch || inputValue.trim();
        if (valueToAdd && !selectedValues.includes(valueToAdd)) {
          const newValues = [...selectedValues, valueToAdd];
          setInputValue('');
          setIsOpen(false);
          setHighlightedIndex(-1);
          onChange(newValues);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredValues.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Backspace' && !inputValue && selectedValues.length > 0) {
      // Remove last selected value when backspacing on empty input
      removeValue(selectedValues[selectedValues.length - 1]);
    }
  };

  const addValue = (value) => {
    if (value && !selectedValues.includes(value)) {
      onChange([...selectedValues, value]);
      setInputValue('');
      setIsOpen(false);
      setHighlightedIndex(-1);
      
      // Focus back on input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  const removeValue = (valueToRemove) => {
    onChange(selectedValues.filter(v => v !== valueToRemove));
    
    // Focus back on input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleOptionClick = (value) => {
    addValue(value);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <div className="relative" ref={tooltipRef}>
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <HelpCircle className="h-3 w-3" />
          </button>
          {showTooltip && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg p-2 shadow-lg z-50">
              <div className="space-y-1">
                <div>• Click or type to select options</div>
                <div>• Press <strong>Enter</strong> or <strong>Tab</strong> to add</div>
                <div>• Click <strong>X</strong> to remove</div>
                <div>• Search updates automatically</div>
              </div>
              <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
            </div>
          )}
        </div>
      </div>
      
      <div className="relative">
        <div
          className="w-full min-h-[40px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white dark:bg-gray-700 flex flex-wrap gap-1 items-center cursor-text"
          onClick={() => {
            // Focus input and open dropdown when clicking container
            if (inputRef.current) {
              inputRef.current.focus();
            }
            if (filteredValues.length > 0) {
              setIsOpen(true);
            }
          }}
        >
          {/* Selected value bubbles */}
          {selectedValues.map((value, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md"
            >
              {value}
              <button
                type="button"
                onClick={() => removeValue(value)}
                className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          
          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              // Open dropdown on focus - show all options or filtered options
              if (filteredValues.length > 0) {
                setIsOpen(true);
              }
            }}
            placeholder={selectedValues.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            autoComplete="off"
          />

          {/* Dropdown arrow indicator */}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Dropdown */}
        {isOpen && filteredValues.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredValues.map((value, index) => (
              <button
                key={index}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  index === highlightedIndex 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}
                onClick={() => handleOptionClick(value)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {value}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelectFilter;