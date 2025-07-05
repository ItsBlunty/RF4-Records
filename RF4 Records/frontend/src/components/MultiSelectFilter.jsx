import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

const MultiSelectFilter = ({ 
  label, 
  placeholder, 
  values = [], 
  selectedValues = [], 
  onChange, 
  onKeyPress,
  className = '' 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredValues, setFilteredValues] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter available values based on input and exclude already selected
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredValues([]);
      setIsOpen(false);
      return;
    }

    const filtered = values
      .filter(value => 
        value.toLowerCase().includes(inputValue.toLowerCase()) &&
        !selectedValues.includes(value)
      )
      .slice(0, 10); // Limit to 10 suggestions

    setFilteredValues(filtered);
    setIsOpen(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [inputValue, values, selectedValues]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
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
      
      if (highlightedIndex >= 0 && filteredValues[highlightedIndex]) {
        // Select highlighted option
        addValue(filteredValues[highlightedIndex]);
      } else if (inputValue.trim()) {
        // If there's an exact match, use it; otherwise, use the input value
        const exactMatch = values.find(v => 
          v.toLowerCase() === inputValue.toLowerCase() && 
          !selectedValues.includes(v)
        );
        addValue(exactMatch || inputValue.trim());
      }
      
      // Call parent's onKeyPress if provided
      if (onKeyPress) {
        onKeyPress(e);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      
      if (inputValue.trim()) {
        // Add current input as a bubble on Tab
        const exactMatch = values.find(v => 
          v.toLowerCase() === inputValue.toLowerCase() && 
          !selectedValues.includes(v)
        );
        addValue(exactMatch || inputValue.trim());
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
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      
      <div className="relative">
        <div className="w-full min-h-[40px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white dark:bg-gray-700 flex flex-wrap gap-1 items-center">
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
              if (inputValue && filteredValues.length > 0) {
                setIsOpen(true);
              }
            }}
            placeholder={selectedValues.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            autoComplete="off"
          />
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
      
      {/* Helper text */}
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Press Enter to search, Tab to add as bubble, or click from dropdown
      </div>
    </div>
  );
};

export default MultiSelectFilter;