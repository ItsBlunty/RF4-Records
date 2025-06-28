import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

const SkillTrees = () => {
  const [selectedTree, setSelectedTree] = useState(null);
  const [skillData, setSkillData] = useState({});
  const [investedPoints, setInvestedPoints] = useState({});
  const [availablePoints, setAvailablePoints] = useState(100); // Start with some points for testing

  // Skill tree definitions matching the game layout
  const skillTrees = [
    { id: 'float-fishing', name: 'FLOAT FISHING', icon: '🎣' },
    { id: 'spin-fishing', name: 'SPIN FISHING', icon: '🎯' },
    { id: 'bottom-fishing', name: 'BOTTOM FISHING', icon: '⚓' },
    { id: 'marine-fishing', name: 'MARINE FISHING', icon: '🌊' },
    { id: 'harvesting-baits', name: 'HARVESTING BAITS', icon: '🐛' },
    { id: 'cooking', name: 'COOKING', icon: '🍳' },
    { id: 'making-groundbait', name: 'MAKING GROUNDBAIT', icon: '🥄' },
    { id: 'making-lures', name: 'MAKING LURES', icon: '🎨' }
  ];

  // Parse CSV data and organize by skill tree
  useEffect(() => {
    const parsedData = parseSkillTreeData();
    setSkillData(parsedData);
  }, []);

  const parseSkillTreeData = () => {
    // Parse the actual CSV data structure
    const skillTreeMap = {
      'Float Fishing': 'float-fishing',
      'Spin Fishing': 'spin-fishing', 
      'Bottom Fishing': 'bottom-fishing',
      'Marine Fishing': 'marine-fishing',
      'Harvesting Baits': 'harvesting-baits',
      'Cooking': 'cooking',
      'Making Groundbait': 'making-groundbait',
      'Making Lures': 'making-lures'
    };

    const csvData = [
      { order: 1, skillTree: 'Float Fishing', skill: 'Fishing with a telescopic rod', unlockAt: '0%', points: '7/7', sharedWith: '' },
      { order: 2, skillTree: 'Float Fishing', skill: 'Using a rig with a fixed line', unlockAt: '0%', points: '3/3', sharedWith: '' },
      { order: 3, skillTree: 'Float Fishing', skill: 'Using a spinning reel', unlockAt: '0%', points: '5/5', sharedWith: 'Spin - Using a Spinning Reel,Marine - Using a Spinning Reel,Bottom - Using a Spinning Reel' },
      { order: 4, skillTree: 'Float Fishing', skill: 'Luminous float', unlockAt: '25%', points: '---', sharedWith: '' },
      { order: 5, skillTree: 'Float Fishing', skill: 'Fishing with a Bolognese rod', unlockAt: '30%', points: '7/7', sharedWith: '' },
      { order: 6, skillTree: 'Float Fishing', skill: 'Casting Power Control', unlockAt: '35%', points: '---', sharedWith: '' },
      { order: 7, skillTree: 'Float Fishing', skill: 'Using a Bolognese rig', unlockAt: '35%', points: '3/3', sharedWith: '' },
      { order: 8, skillTree: 'Float Fishing', skill: 'Using a leader', unlockAt: '40%', points: '---', sharedWith: '' },
      { order: 9, skillTree: 'Float Fishing', skill: 'Use of Carp Hair Rig', unlockAt: '45%', points: '3/3', sharedWith: '' },
      { order: 10, skillTree: 'Float Fishing', skill: 'Using Bait Slingshot', unlockAt: '45%', points: '3/3', sharedWith: '' },
      { order: 11, skillTree: 'Float Fishing', skill: 'Using a slider rig', unlockAt: '50%', points: '3/3', sharedWith: '' },
      { order: 12, skillTree: 'Float Fishing', skill: 'Fishing with a match rod', unlockAt: '60%', points: '7/7', sharedWith: '' },
      { order: 13, skillTree: 'Float Fishing', skill: 'Using a match rig', unlockAt: '60%', points: '3/3', sharedWith: '' },
      { order: 14, skillTree: 'Float Fishing', skill: 'Use of Carp Hair Pop-Up Rig', unlockAt: '70%', points: '3/3', sharedWith: '' },
      { order: 15, skillTree: 'Float Fishing', skill: 'Fishing with a "sandwich" bait', unlockAt: '80%', points: '---', sharedWith: '' },
      { order: 16, skillTree: 'Float Fishing', skill: 'Use of Cobra', unlockAt: '85%', points: '3/3', sharedWith: '' },
      { order: 17, skillTree: 'Float Fishing', skill: 'Using a baitfish float rig', unlockAt: '90%', points: '3/3', sharedWith: '' },
      { order: 18, skillTree: 'Float Fishing', skill: 'Sbirolino with a soft lure', unlockAt: '100%', points: '3/3', sharedWith: '' },
      { order: 19, skillTree: 'Float Fishing', skill: 'Sbirolino with a lure', unlockAt: '100%', points: '3/3', sharedWith: '' },
    ];

    const organized = {};
    
    csvData.forEach(row => {
      const treeKey = skillTreeMap[row.skillTree];
      if (!treeKey) return;

      if (!organized[treeKey]) {
        organized[treeKey] = [];
      }

      const maxPoints = row.points === '---' ? 0 : parseInt(row.points.split('/')[1]) || 0;
      const sharedWith = row.sharedWith ? row.sharedWith.split(',').map(s => s.trim()) : [];

      organized[treeKey].push({
        id: row.order,
        name: row.skill,
        unlockAt: row.unlockAt,
        maxPoints,
        sharedWith,
        order: row.order
      });
    });

    return organized;
  };

  const calculateRequiredLevel = (totalPoints) => {
    if (totalPoints <= 19) return totalPoints + 1;
    if (totalPoints <= 39) return 20 + Math.floor((totalPoints - 19) / 2);
    if (totalPoints <= 69) return 30 + Math.floor((totalPoints - 39) / 3);
    return 40 + Math.floor((totalPoints - 69) / 4);
  };

  const getTotalInvestedPoints = () => {
    return Object.values(investedPoints).reduce((total, treePoints) => {
      return total + Object.values(treePoints).reduce((sum, points) => sum + points, 0);
    }, 0);
  };

  const getTreeProgress = (treeId) => {
    const tree = skillData[treeId] || [];
    const treePoints = investedPoints[treeId] || {};
    const totalSkills = tree.filter(skill => skill.maxPoints > 0).length;
    const completedSkills = tree.filter(skill => 
      skill.maxPoints > 0 && (treePoints[skill.id] || 0) >= skill.maxPoints
    ).length;
    return totalSkills > 0 ? (completedSkills / totalSkills) * 100 : 0;
  };

  const getUnlockedAbilities = (treeId) => {
    const tree = skillData[treeId] || [];
    const treePoints = investedPoints[treeId] || {};
    return tree.filter(skill => (treePoints[skill.id] || 0) > 0).length;
  };

  const getTotalTreePoints = (treeId) => {
    const treePoints = investedPoints[treeId] || {};
    return Object.values(treePoints).reduce((sum, points) => sum + points, 0);
  };

  const investPoint = (treeId, skillId) => {
    const tree = skillData[treeId] || [];
    const skill = tree.find(s => s.id === skillId);
    if (!skill || availablePoints <= 0) return;

    const currentPoints = investedPoints[treeId]?.[skillId] || 0;
    if (currentPoints >= skill.maxPoints) return;

    setInvestedPoints(prev => ({
      ...prev,
      [treeId]: {
        ...prev[treeId],
        [skillId]: currentPoints + 1
      }
    }));
    setAvailablePoints(prev => prev - 1);
  };

  const SkillTreeGrid = ({ treeId }) => {
    const tree = skillData[treeId] || [];
    const treePoints = investedPoints[treeId] || {};

    // Create a 3x7 grid layout for most trees (adjust based on actual tree)
    const gridLayout = [];
    for (let i = 0; i < tree.length; i++) {
      gridLayout.push(tree[i]);
    }

    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSelectedTree(null)}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h1 className="text-2xl font-bold text-green-400">
                {skillTrees.find(t => t.id === treeId)?.name} - {getTreeProgress(treeId).toFixed(1)}%
              </h1>
            </div>
            <div className="text-xl font-bold">
              Available points: <span className="text-green-400">{availablePoints}</span>
            </div>
          </div>

          {/* Required Level Display */}
          <div className="mb-6 text-center">
            <span className="text-lg">
              Required Level: <span className="text-yellow-400 font-bold">
                {calculateRequiredLevel(getTotalInvestedPoints())}
              </span>
            </span>
          </div>

          {/* Skill Grid */}
          <div className="grid grid-cols-7 gap-4">
            {gridLayout.map((skill, index) => {
              const invested = treePoints[skill.id] || 0;
              const isMaxed = invested >= skill.maxPoints;
              const canInvest = availablePoints > 0 && !isMaxed && skill.maxPoints > 0;
              
              return (
                <div key={skill.id} className="flex flex-col items-center">
                  <button
                    onClick={() => investPoint(treeId, skill.id)}
                    disabled={!canInvest}
                    className={`
                      w-20 h-20 rounded-full border-4 flex items-center justify-center text-lg font-bold
                      transition-all duration-200 relative
                      ${invested > 0 
                        ? 'bg-green-600 border-green-400 text-white' 
                        : skill.maxPoints > 0
                          ? 'bg-gray-700 border-gray-500 text-gray-300 hover:border-gray-400'
                          : 'bg-gray-800 border-gray-600 text-gray-500'
                      }
                      ${canInvest ? 'hover:scale-105 cursor-pointer' : ''}
                    `}
                  >
                    {skill.maxPoints > 0 ? invested : ''}
                  </button>
                  <div className="mt-2 text-center max-w-24">
                    <div className="text-xs text-gray-300 break-words leading-tight">
                      {skill.name}
                    </div>
                    {skill.maxPoints > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {invested}/{skill.maxPoints}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (selectedTree) {
    return <SkillTreeGrid treeId={selectedTree} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Skill Trees</h1>
          <div className="text-xl">
            Total Level: <span className="text-yellow-400 font-bold">
              {calculateRequiredLevel(getTotalInvestedPoints())}
            </span>
            <span className="ml-6">
              Available Points: <span className="text-green-400 font-bold">{availablePoints}</span>
            </span>
          </div>
        </div>

        {/* Skill Trees Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {skillTrees.slice(0, 7).map((tree) => (
            <button
              key={tree.id}
              onClick={() => setSelectedTree(tree.id)}
              className="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:border-gray-400 transition-colors text-center"
            >
              <div className="text-4xl mb-2">{tree.icon}</div>
              <h3 className="text-sm font-bold mb-2">{tree.name}</h3>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Skill progress: <span className="text-green-400">{getTreeProgress(tree.id).toFixed(1)}%</span></div>
                <div>Unlocked abilities: <span className="text-blue-400">{getUnlockedAbilities(tree.id)} / {(skillData[tree.id] || []).filter(s => s.maxPoints > 0).length}</span></div>
                <div>Invested points: <span className="text-yellow-400">{getTotalTreePoints(tree.id)}</span></div>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom centered tree */}
        <div className="flex justify-center">
          {skillTrees.slice(7).map((tree) => (
            <button
              key={tree.id}
              onClick={() => setSelectedTree(tree.id)}
              className="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:border-gray-400 transition-colors text-center w-64"
            >
              <div className="text-4xl mb-2">{tree.icon}</div>
              <h3 className="text-sm font-bold mb-2">{tree.name}</h3>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Skill progress: <span className="text-green-400">{getTreeProgress(tree.id).toFixed(1)}%</span></div>
                <div>Unlocked abilities: <span className="text-blue-400">{getUnlockedAbilities(tree.id)} / {(skillData[tree.id] || []).filter(s => s.maxPoints > 0).length}</span></div>
                <div>Invested points: <span className="text-yellow-400">{getTotalTreePoints(tree.id)}</span></div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkillTrees;