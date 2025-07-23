import React from 'react';

const import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';

const Lures = () => {
  const [lures, setLures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [minMass, setMinMass] = useState('');
  const [maxMass, setMaxMass] = useState('');
  const [minHookSize, setMinHookSize] = useState('');
  const [maxHookSize, setMaxHookSize] = useState('');
  const [selectedDepth, setSelectedDepth] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedLures, setSelectedLures] = useState([]);
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

  const filteredLures = useMemo(() => {
    return lures.filter(lure => {
      const matchesSearch = !searchTerm || 
        lure.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lure.Components?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lure.Restrictions?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategory || lure.Category === selectedCategory;
      const matchesBrand = !selectedBrand || lure.Brand === selectedBrand;
      const matchesType = !selectedType || lure.Type === selectedType;
      const matchesSize = !selectedSize || lure.Size === selectedSize;
      
      const lureWeight = parseWeight(lure.Mass);
      const matchesMinMass = !minMass || lureWeight >= parseFloat(minMass);
      const matchesMaxMass = !maxMass || lureWeight <= parseFloat(maxMass);
      
      const lureMinHook = parseHookSize(lure['Min Hook Size']);
      const lureMaxHook = parseHookSize(lure['Max Hook Size']);
      const matchesMinHook = !minHookSize || lureMaxHook >= parseFloat(minHookSize);
      const matchesMaxHook = !maxHookSize || lureMinHook <= parseFloat(maxHookSize);
      
      const matchesDepth = !selectedDepth || 
        (selectedDepth === 'surface' && (lure.Depth === '-' || lure.Depth === '0')) ||
        (selectedDepth === 'shallow' && lure.Depth && lure.Depth !== '-' && parseFloat(lure.Depth) <= 3) ||
        (selectedDepth === 'medium' && lure.Depth && lure.Depth !== '-' && parseFloat(lure.Depth) > 3 && parseFloat(lure.Depth) <= 10) ||
        (selectedDepth === 'deep' && lure.Depth && lure.Depth !== '-' && parseFloat(lure.Depth) > 10);
      
      const lurePrice = parsePrice(lure.Price);
      const matchesMinPrice = !minPrice || lurePrice >= parseFloat(minPrice);
      const matchesMaxPrice = !maxPrice || lurePrice <= parseFloat(maxPrice);

      return matchesSearch && matchesCategory && matchesBrand && matchesType && 
             matchesSize && matchesMinMass && matchesMaxMass && matchesMinHook && 
             matchesMaxHook && matchesDepth && matchesMinPrice && matchesMaxPrice;
    });
  }, [lures, searchTerm, selectedCategory, selectedBrand, selectedType, selectedSize, 
      minMass, maxMass, minHookSize, maxHookSize, selectedDepth, minPrice, maxPrice]);

  const sortedLures = useMemo(() => {
    return [...filteredLures].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.Name || '';
          bValue = b.Name || '';
          break;
        case 'mass':
          aValue = parseWeight(a.Mass);
          bValue = parseWeight(b.Mass);
          break;
        case 'price':
          aValue = parsePrice(a.Price);
          bValue = parsePrice(b.Price);
          break;
        case 'rating':
          aValue = parseFloat(a.Rating) || 0;
          bValue = parseFloat(b.Rating) || 0;
          break;
        default:
          aValue = a[sortBy] || '';
          bValue = b[sortBy] || '';
      }
      
      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [filteredLures, sortBy, sortOrder]);

  const uniqueValues = useMemo(() => {
    return {
      categories: [...new Set(lures.map(l => l.Category).filter(Boolean))].sort(),
      brands: [...new Set(lures.map(l => l.Brand).filter(Boolean))].sort(),
      types: [...new Set(lures.map(l => l.Type).filter(Boolean))].sort(),
      sizes: [...new Set(lures.map(l => l.Size).filter(Boolean))].sort()
    };
  }, [lures]);

  const handleLureSelect = (lure) => {
    setSelectedLures(prev => {
      const isSelected = prev.some(l => l.Name === lure.Name);
      if (isSelected) {
        return prev.filter(l => l.Name !== lure.Name);
      } else {
        return [...prev, lure];
      }
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedType('');
    setSelectedSize('');
    setMinMass('');
    setMaxMass('');
    setMinHookSize('');
    setMaxHookSize('');
    setSelectedDepth('');
    setMinPrice('');
    setMaxPrice('');
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
    return stars;
  };

  const formatHookSize = (minHook, maxHook) => {
    if ((!minHook || minHook === '-') && (!maxHook || maxHook === '-')) return '-';
    if (!minHook || minHook === '-') return `≤${maxHook}`;
    if (!maxHook || maxHook === '-') return `≥${minHook}`;
    if (minHook === maxHook) return minHook;
    return `${minHook}-${maxHook}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading lures data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">RF4 Lures Database</h1>
        <div className="text-sm text-gray-600">
          Showing {sortedLures.length} of {lures.length} lures
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Search lures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Categories</option>
            {uniqueValues.categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Brands</option>
            {uniqueValues.brands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Types</option>
            {uniqueValues.types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-blue-600 hover:text-blue-800"
          >
            {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
          </button>
          
          <button
            onClick={clearFilters}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Clear Filters
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">All Sizes</option>
              {uniqueValues.sizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min Mass (g)"
                value={minMass}
                onChange={(e) => setMinMass(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />
              <input
                type="number"
                placeholder="Max Mass (g)"
                value={maxMass}
                onChange={(e) => setMaxMass(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />
            </div>
            
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min Hook"
                value={minHookSize}
                onChange={(e) => setMinHookSize(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />
              <input
                type="number"
                placeholder="Max Hook"
                value={maxHookSize}
                onChange={(e) => setMaxHookSize(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />
            </div>
            
            <select
              value={selectedDepth}
              onChange={(e) => setSelectedDepth(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">All Depths</option>
              <option value="surface">Surface (0m)</option>
              <option value="shallow">Shallow (≤3m)</option>
              <option value="medium">Medium (3-10m)</option>
              <option value="deep">Deep (>10m)</option>
            </select>
            
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min Price"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />
              <input
                type="number"
                placeholder="Max Price"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Sort and Compare Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4 items-center">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="name">Sort by Name</option>
            <option value="Category">Sort by Category</option>
            <option value="Brand">Sort by Brand</option>
            <option value="mass">Sort by Mass</option>
            <option value="price">Sort by Price</option>
            <option value="rating">Sort by Rating</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
        
        {selectedLures.length > 0 && (
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Compare Selected ({selectedLures.length})
          </button>
        )}
      </div>

      {/* Comparison Table */}
      {showComparison && selectedLures.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Lure Comparison</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Brand</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Mass</th>
                  <th className="px-4 py-2 text-left">Hook Size</th>
                  <th className="px-4 py-2 text-left">Depth</th>
                  <th className="px-4 py-2 text-left">Price</th>
                  <th className="px-4 py-2 text-left">Rating</th>
                </tr>
              </thead>
              <tbody>
                {selectedLures.map((lure, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2 font-medium">{lure.Name}</td>
                    <td className="px-4 py-2">{lure.Category}</td>
                    <td className="px-4 py-2">{lure.Brand}</td>
                    <td className="px-4 py-2">{lure.Type}</td>
                    <td className="px-4 py-2">{lure.Mass}</td>
                    <td className="px-4 py-2">{formatHookSize(lure['Min Hook Size'], lure['Max Hook Size'])}</td>
                    <td className="px-4 py-2">{lure.Depth || '-'}</td>
                    <td className="px-4 py-2">{lure.Price}</td>
                    <td className="px-4 py-2">{renderStars(lure.Rating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => setSelectedLures([])}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Clear Comparison
          </button>
        </div>
      )}

      {/* Lures Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedLures.map((lure, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{lure.Name}</h3>
              <input
                type="checkbox"
                checked={selectedLures.some(l => l.Name === lure.Name)}
                onChange={() => handleLureSelect(lure)}
                className="ml-2"
              />
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Category:</span>
                <span className="font-medium">{lure.Category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Brand:</span>
                <span className="font-medium">{lure.Brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{lure.Type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Size:</span>
                <span className="font-medium">{lure.Size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mass:</span>
                <span className="font-medium">{lure.Mass}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hook Size:</span>
                <span className="font-medium">{formatHookSize(lure['Min Hook Size'], lure['Max Hook Size'])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Depth:</span>
                <span className="font-medium">{lure.Depth || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-medium">{lure.Price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rating:</span>
                <span className="font-medium">{renderStars(lure.Rating)}</span>
              </div>
              {lure.Components && (
                <div className="mt-3">
                  <span className="text-gray-600">Components:</span>
                  <p className="text-sm mt-1">{lure.Components}</p>
                </div>
              )}
              {lure.Restrictions && (
                <div className="mt-3">
                  <span className="text-gray-600">Restrictions:</span>
                  <p className="text-sm mt-1">{lure.Restrictions}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {sortedLures.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No lures found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};
  );
};

export default Lures;