import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { Search, Filter, Scale } from 'lucide-react';

const Lures = () => {
  const [lures, setLures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sizeFilter, setSizeFilter] = useState('All');
  const [depthFilter, setDepthFilter] = useState('All');
  const [minMass, setMinMass] = useState('');
  const [maxMass, setMaxMass] = useState('');
  const [minHookSize, setMinHookSize] = useState('');
  const [maxHookSize, setMaxHookSize] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    const loadLures = async () => {
      try {
        const response = await fetch('/LuresData.csv');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              console.error('CSV parsing errors:', results.errors);
            }
            setLures(results.data);
            setLoading(false);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            setError('Failed to load lures data');
            setLoading(false);
          }
        });
      } catch (err) {
        console.error('Error loading CSV:', err);
        setError('Failed to load lures data');
        setLoading(false);
      }
    };

    loadLures();
  }, []);

  const parseWeight = (weightStr) => {
    if (!weightStr || weightStr === '-') return 0;
    const cleanWeight = weightStr.replace(/[^\d.]/g, '');
    return parseFloat(cleanWeight) || 0;
  };

  const parsePrice = (priceStr) => {
    if (!priceStr || priceStr === '-') return 0;
    const cleanPrice = priceStr.replace(/[^\d.]/g, '');
    return parseFloat(cleanPrice) || 0;
  };

  const parseHookSize = (hookStr) => {
    if (!hookStr || hookStr === '-') return 0;
    const cleanHook = hookStr.replace(/[^\d.]/g, '');
    return parseFloat(cleanHook) || 0;
  };

  const formatHookSize = (minHook, maxHook) => {
    if ((!minHook || minHook === '-') && (!maxHook || maxHook === '-')) return '-';
    if (!minHook || minHook === '-') return `≤${maxHook}`;
    if (!maxHook || maxHook === '-') return `≥${minHook}`;
    if (minHook === maxHook) return minHook;
    return `${minHook}-${maxHook}`;
  };

  const renderStars = (rating) => {
    const numRating = parseFloat(rating) || 0;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= numRating ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      );
    }
    return <span className="flex">{stars}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading lure information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error loading lure data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
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
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">Lure data loading...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lures;