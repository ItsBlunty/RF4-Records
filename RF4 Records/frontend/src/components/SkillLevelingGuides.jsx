import React from 'react';

const SkillLevelingGuides = () => {
  const harvestingBaits = [
    { range: '0% to 20%', bait: 'Wet bread' },
    { range: '20% to 30%', bait: 'Pearl barley' },
    { range: '30% to 35%', bait: 'Semolina' },
    { range: '35% to 50%', bait: 'Garlic dough' },
    { range: '50% to 100%', bait: 'Egg dough' }
  ];

  const groundbait = [
    { range: '0% to 15%', mixture: 'Ground Crackers Only' },
    { range: '15% to 30%', mixture: 'Feed Only' },
    { range: '30% to 40%', mixture: 'Feed + Anise Oil Attractant' },
    { range: '40% to 50%', mixture: 'Feed + Fennel Attractant' },
    { range: '50% to 60%', mixture: 'Feed + Hempseed Oil Attractant' },
    { range: '60% to 70%', mixture: 'Feed + Honey Attractant' },
    { range: '70% to 80%', mixture: 'Sunflower Seed Base Only' },
    { range: '80% to 85%', mixture: 'Feed + Red Plum Attractant' },
    { range: '85% to 90%', mixture: 'Feed + Linseed Attractant' },
    { range: '90% to 95%', mixture: 'Feed + Salmon Attractant' },
    { range: '95% to 100%', mixture: 'Feed + Bitter Almond Attractant' }
  ];

  const lureMaking = [
    { range: '0% to 20%', lure: 'Novgorod spoon' },
    { range: '20% to 36%', lure: 'Foam-rubber fish 001' },
    { range: '36% to 50%', lure: 'Small Lower Volga spoon' },
    { range: '50% to 55%', lure: 'Long Serdobsk spoon' },
    { range: '55% to 100%', lure: 'Zander spoon' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Skill Leveling Guides
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          The following guides are the best way to get to higher skill levels without spending too much silver. Using latest unlocked items will always be fastest, but won't be the most cost effective.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Harvesting Baits */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            Harvesting Baits
          </h2>
          
          <div className="space-y-3 mb-6">
            {harvestingBaits.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="font-medium text-blue-600 dark:text-blue-400 text-sm">
                  {item.range}
                </span>
                <span className="text-gray-700 dark:text-gray-300 text-sm">
                  {item.bait}
                </span>
              </div>
            ))}
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p><strong>Tips:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Digging with a shovel or scoop can provide a lot of early skill points for no cost.</li>
              <li>Cutting up freshwater fish at 50% is another cheap way to get points. Cutting Non-Marker fish is basically free.</li>
              <li>Cutting up saltwater fish at the sea at 60%, and making deadbaits at 65% from sea fish are also cheap points.</li>
              <li>Buying a Bait Bucket allows you to make baitfish at 65% from the correct sized small fish for cheap points.</li>
            </ul>
          </div>
        </div>

        {/* Groundbait */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            Groundbait
          </h2>
          
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Feed is an item bought at the "Farmers Market" On Winding Rivulet!
            </p>
          </div>

          <div className="space-y-2">
            {groundbait.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="font-medium text-blue-600 dark:text-blue-400 text-xs">
                  {item.range}
                </span>
                <span className="text-gray-700 dark:text-gray-300 text-xs text-right">
                  {item.mixture}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Lure Making */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            Lure Making
          </h2>
          
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Reminder!</strong> You No Longer Need Hooks To Level Lure Making!
            </p>
          </div>

          <div className="space-y-3 mb-4">
            {lureMaking.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="font-medium text-blue-600 dark:text-blue-400 text-sm">
                  {item.range}
                </span>
                <span className="text-gray-700 dark:text-gray-300 text-sm">
                  {item.lure}
                </span>
              </div>
            ))}
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p><strong>Tip:</strong> You can also keep making Long Serdobsk to 68.7% instead!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillLevelingGuides; 