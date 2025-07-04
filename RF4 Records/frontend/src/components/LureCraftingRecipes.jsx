import React, { useState, useMemo } from 'react';
import { Search, Package, Wrench } from 'lucide-react';

const LureCraftingRecipes = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTool, setSelectedTool] = useState('all');

  // Parse the CSV data (in order from the CSV file)
  const recipeData = [
    { name: "Novgorod Spoon", type: "Lure", tool: "Novgorod Spoon Mold", ingredients: ["Sandpaper", "Tin Bar"] },
    { name: "Moscow Spoon", type: "Lure", tool: "Moscow Spoon Mold", ingredients: ["Sandpaper", "Tin Bar"] },
    { name: "Foam-Rubber Fish", type: "Lure", tool: "", ingredients: ["A Set of Paints", "Foam Rubber"] },
    { name: "Large Lower Volga Spoon", type: "Lure", tool: "Lower Volga Spoon Mold", ingredients: ["Sandpaper", "Tin Bar"] },
    { name: "Small Lower Volga Spoon", type: "Lure", tool: "Lower Volga Spoon Mold", ingredients: ["Sandpaper", "Tin Bar"] },
    { name: "Short Serdobsk Spoon", type: "Lure", tool: "Serdobsk Spoon Mold", ingredients: ["Sandpaper", "Tin Bar"] },
    { name: "Long Serdobsk Spoon", type: "Lure", tool: "Serdobsk Spoon Mold", ingredients: ["Sandpaper", "Tin Bar"] },
    { name: "Zander Spoon", type: "Lure", tool: "Zander Spoon Mold", ingredients: ["Sandpaper", "Tin Bar"] },
    { name: "Unpainted Crank 65S", type: "Lure", tool: "Wood Carving Knife", ingredients: ["Sandpaper", "Steel Wire", "Birch Block"] },
    { name: "Unpainted Jointed 90S", type: "Lure", tool: "Wood Carving Knife", ingredients: ["Sandpaper", "Steel Wire", "Birch Block"] },
    { name: "Unpainted Minnow 100S", type: "Lure", tool: "Wood Carving Knife", ingredients: ["Sandpaper", "Steel Wire", "Birch Block"] },
    { name: "Balsa Crank 130F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Balsa Block"] },
    { name: "Balsa Crank 50F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Balsa Block"] },
    { name: "Balsa Crank 65F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Balsa Block"] },
    { name: "Balsa Crank 70F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Balsa Block"] },
    { name: "Balsa Crank 80F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Balsa Block"] },
    { name: "Balsa Minnow 110F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Balsa Block"] },
    { name: "Balsa Minnow 140F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Balsa Block"] },
    { name: "Balsa Minnow 65F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Balsa Block"] },
    { name: "Balsa Minnow 75F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Balsa Block"] },
    { name: "Balsa Minnow 90F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Balsa Block"] },
    { name: "Balsa Compound 70S", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Balsa Block"] },
    { name: "Balsa Compound 80S", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Balsa Block"] },
    { name: "Balsa Jointed 140S", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Balsa Block"] },
    { name: "Popper M1 65F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Burl Wood Bar"] },
    { name: "Walker M1 65F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Burl Wood Bar"] },
    { name: "Balsa Minnow 170F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Cherry Wood"] },
    { name: "Jerkbait Wide 140F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Cherry Wood"] },
    { name: "Long Jerkbait 110F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Cherry Wood"] },
    { name: "Wide Jerkbait 100F", type: "Lure", tool: "Professional Wood Carving Knife", ingredients: ["Sandpaper", "A Set of Paints", "Steel Wire", "Cherry Wood"] }
  ];

  // Get unique tools for filter
  const uniqueTools = [...new Set(recipeData.map(recipe => recipe.tool).filter(tool => tool))];

  // Filter recipes based on search and tool filter
  const filteredRecipes = useMemo(() => {
    return recipeData.filter(recipe => {
      const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           recipe.ingredients.some(ingredient => ingredient.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTool = selectedTool === 'all' || recipe.tool === selectedTool;
      return matchesSearch && matchesTool;
    });
  }, [searchTerm, selectedTool]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Lure Crafting Recipes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete crafting recipes for all lures in Russian Fishing 4
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search recipes or ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tool Filter */}
          <div className="relative">
            <select
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                       rounded-lg px-4 py-2 pr-8 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Tools</option>
              <option value="">No Tool Required</option>
              {uniqueTools.map(tool => (
                <option key={tool} value={tool}>{tool}</option>
              ))}
            </select>
            <Wrench className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredRecipes.length} of {recipeData.length} recipes
        </div>

        {/* Recipes Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Lure Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Required Tool
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ingredients
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRecipes.map((recipe, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 text-blue-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {recipe.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {recipe.tool || 'None'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {recipe.ingredients.join(', ')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* No Results */}
        {filteredRecipes.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No recipes found matching your criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LureCraftingRecipes;