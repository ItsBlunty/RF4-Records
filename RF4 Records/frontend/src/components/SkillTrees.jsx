import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

// Import skill tree icons
import floatFishingIcon from '../assets/float-fishing-icon.png';
import spinFishingIcon from '../assets/spin-fishing-icon.png';
import bottomFishingIcon from '../assets/bottom-fishing-icon.png';
import marineFishingIcon from '../assets/marine-fishing-icon.png';
import harvestingBaitsIcon from '../assets/harvesting-baits-icon.png';
import cookingIcon from '../assets/cooking-icon.png';
import makingGroundbaitIcon from '../assets/making-groundbait-icon.png';
import makingLuresIcon from '../assets/making-lures-icon.png';

const SkillTrees = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedTree, setSelectedTree] = useState(null);
  const [skillData, setSkillData] = useState({});
  const [investedPoints, setInvestedPoints] = useState({});
  const [collections, setCollections] = useState(0);
  // No available points - just track total used points and required level

  // Skill tree definitions matching the game layout
  const skillTrees = [
    { id: 'float-fishing', name: 'FLOAT FISHING', icon: floatFishingIcon },
    { id: 'spin-fishing', name: 'SPIN FISHING', icon: spinFishingIcon },
    { id: 'bottom-fishing', name: 'BOTTOM FISHING', icon: bottomFishingIcon },
    { id: 'marine-fishing', name: 'MARINE FISHING', icon: marineFishingIcon },
    { id: 'harvesting-baits', name: 'HARVESTING BAITS', icon: harvestingBaitsIcon },
    { id: 'cooking', name: 'COOKING', icon: cookingIcon },
    { id: 'making-groundbait', name: 'MAKING GROUNDBAIT', icon: makingGroundbaitIcon },
    { id: 'making-lures', name: 'MAKING LURES', icon: makingLuresIcon }
  ];

  // Parse CSV data and organize by skill tree
  useEffect(() => {
    const parsedData = parseSkillTreeData();
    setSkillData(parsedData);
  }, []);

  // Tree ID mapping for compact URLs
  const treeIdMap = {
    'float-fishing': 'f',
    'spin-fishing': 's', 
    'bottom-fishing': 'b',
    'marine-fishing': 'm',
    'harvesting-baits': 'h',
    'cooking': 'c',
    'making-groundbait': 'g',
    'making-lures': 'l'
  };

  const reverseTreeIdMap = Object.fromEntries(
    Object.entries(treeIdMap).map(([key, value]) => [value, key])
  );

  // Encode skill points to compact format: f1p7_s2p3_c5p1
  const encodeSkillPoints = (points) => {
    const parts = [];
    Object.entries(points).forEach(([treeId, skills]) => {
      const shortTreeId = treeIdMap[treeId];
      if (shortTreeId) {
        Object.entries(skills).forEach(([skillId, pointCount]) => {
          if (pointCount > 0) {
            parts.push(`${shortTreeId}${skillId}p${pointCount}`);
          }
        });
      }
    });
    return parts.join('_');
  };

  // Decode compact format back to skill points object
  const decodeSkillPoints = (encoded) => {
    const result = {};
    if (!encoded) return result;
    
    const parts = encoded.split('_');
    parts.forEach(part => {
      const match = part.match(/^([fsbmhcgl])(\d+)p(\d+)$/);
      if (match) {
        const [, shortTreeId, skillId, pointCount] = match;
        const treeId = reverseTreeIdMap[shortTreeId];
        if (treeId) {
          if (!result[treeId]) result[treeId] = {};
          result[treeId][skillId] = parseInt(pointCount);
        }
      }
    });
    return result;
  };

  // Load skill tree data from URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const pointsParam = searchParams.get('points');
    const collectionsParam = searchParams.get('collections');
    
    if (pointsParam) {
      try {
        // Try new compact format first
        const decodedPoints = decodeSkillPoints(pointsParam);
        if (Object.keys(decodedPoints).length > 0) {
          setInvestedPoints(decodedPoints);
        } else {
          // Fallback to old base64 format for backward compatibility
          const legacyDecoded = JSON.parse(atob(pointsParam));
          setInvestedPoints(legacyDecoded);
        }
      } catch (error) {
        console.warn('Invalid points parameter in URL:', error);
      }
    }
    
    if (collectionsParam) {
      const collectionsValue = parseInt(collectionsParam);
      if (!isNaN(collectionsValue) && collectionsValue >= 0 && collectionsValue <= 99) {
        setCollections(collectionsValue);
      }
    }
  }, [location.search]);

  // Update URL automatically when skill points or collections change
  useEffect(() => {
    const params = new URLSearchParams();
    
    // Encode invested points using compact format if any exist
    if (Object.keys(investedPoints).length > 0) {
      const encodedPoints = encodeSkillPoints(investedPoints);
      if (encodedPoints) {
        params.set('points', encodedPoints);
      }
    }
    
    // Add collections if non-zero
    if (collections > 0) {
      params.set('collections', collections.toString());
    }
    
    // Update URL without triggering navigation
    const newUrl = params.toString() ? `${location.pathname}?${params.toString()}` : location.pathname;
    if (newUrl !== `${location.pathname}${location.search}`) {
      navigate(newUrl, { replace: true });
    }
  }, [investedPoints, collections, location.pathname, location.search, navigate]);

  // Copy current URL to clipboard (always up-to-date)
  const shareSkillBuild = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert('Skill tree URL copied to clipboard!');
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Skill tree URL copied to clipboard!');
    }
  };

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
      // Float Fishing
      { order: 1, skillTree: 'Float Fishing', skill: 'Fishing with a telescopic rod', unlockAt: '0%', points: '7/7', sharedWith: '' },
      { order: 2, skillTree: 'Float Fishing', skill: 'Using a rig with a fixed line', unlockAt: '0%', points: '3/3', sharedWith: '' },
      { order: 3, skillTree: 'Float Fishing', skill: 'Using a spinning reel', unlockAt: '0%', points: '5/5', sharedWith: 'Spin - Using a spinning reel,Marine - Using a spinning reel,Bottom - Using a spinning reel' },
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
      
      // Spin Fishing
      { order: 20, skillTree: 'Spin Fishing', skill: 'Using a spinning reel', unlockAt: '0%', points: '5/5', sharedWith: 'Float - Using a spinning reel,Marine - Using a spinning reel,Bottom - Using a spinning reel' },
      { order: 21, skillTree: 'Spin Fishing', skill: 'Fishing with a spinning rod', unlockAt: '0%', points: '7/7', sharedWith: '' },
      { order: 22, skillTree: 'Spin Fishing', skill: 'Fishing with spinnerbaits', unlockAt: '0%', points: '3/3', sharedWith: '' },
      { order: 23, skillTree: 'Spin Fishing', skill: 'Fishing with spoon', unlockAt: '15%', points: '3/3', sharedWith: '' },
      { order: 24, skillTree: 'Spin Fishing', skill: 'Jigging', unlockAt: '25%', points: '3/3', sharedWith: 'Marine - Using marine jigging rigs,Marine - Using filet rigs' },
      { order: 25, skillTree: 'Spin Fishing', skill: 'Fishing with a casting rod', unlockAt: '30%', points: '7/7', sharedWith: '' },
      { order: 26, skillTree: 'Spin Fishing', skill: 'Using a classic baitcasting reel', unlockAt: '30%', points: '5/5', sharedWith: '' },
      { order: 27, skillTree: 'Spin Fishing', skill: 'Fishing with a wobbler', unlockAt: '35%', points: '3/3', sharedWith: '' },
      { order: 28, skillTree: 'Spin Fishing', skill: 'Using a three-way rig', unlockAt: '45%', points: '3/3', sharedWith: '' },
      { order: 29, skillTree: 'Spin Fishing', skill: 'Using a low profile reel', unlockAt: '50%', points: '5/5', sharedWith: '' },
      { order: 30, skillTree: 'Spin Fishing', skill: 'Using light conventional reels', unlockAt: '50%', points: '5/5', sharedWith: 'Marine - Using a heavy conventional reel,Marine - Using light conventional reels,Spin - Using a heavy conventional reel' },
      { order: 31, skillTree: 'Spin Fishing', skill: 'Using a drop-shot rig', unlockAt: '55%', points: '3/3', sharedWith: '' },
      { order: 32, skillTree: 'Spin Fishing', skill: 'Casting power control', unlockAt: '55%', points: '---', sharedWith: '' },
      { order: 33, skillTree: 'Spin Fishing', skill: 'Fishing with a topwater lure', unlockAt: '60%', points: '3/3', sharedWith: '' },
      { order: 34, skillTree: 'Spin Fishing', skill: 'Using a wacky rig', unlockAt: '70%', points: '3/3', sharedWith: '' },
      { order: 35, skillTree: 'Spin Fishing', skill: 'Using a Texas rig', unlockAt: '75%', points: '3/3', sharedWith: '' },
      { order: 36, skillTree: 'Spin Fishing', skill: 'Using a Carolina rig', unlockAt: '80%', points: '3/3', sharedWith: '' },
      { order: 37, skillTree: 'Spin Fishing', skill: 'Using a heavy conventional reel', unlockAt: '90%', points: '5/5', sharedWith: 'Marine - Using a heavy conventional reel,Marine - Using light conventional reels,Spin - Using light conventional reels' },
      { order: 38, skillTree: 'Spin Fishing', skill: 'Using a rig with a jerkbait', unlockAt: '90%', points: '3/3', sharedWith: '' },
      { order: 39, skillTree: 'Spin Fishing', skill: 'Fishing with a jerkbait rod', unlockAt: '90%', points: '7/7', sharedWith: '' },
      { order: 40, skillTree: 'Spin Fishing', skill: 'Sbirolino with a soft lure', unlockAt: '100%', points: '3/3', sharedWith: '' },
      { order: 41, skillTree: 'Spin Fishing', skill: 'Sbirolino with a lure', unlockAt: '100%', points: '3/3', sharedWith: '' },
      
      // Bottom Fishing
      { order: 42, skillTree: 'Bottom Fishing', skill: 'Using a spinning reel', unlockAt: '0%', points: '5/5', sharedWith: 'Spin - Using a spinning reel,Marine - Using a spinning reel,Float - Using a spinning reel' },
      { order: 43, skillTree: 'Bottom Fishing', skill: 'Using a simple bottom rig', unlockAt: '0%', points: '3/3', sharedWith: '' },
      { order: 44, skillTree: 'Bottom Fishing', skill: 'Fishing with a feeder rod', unlockAt: '0%', points: '7/7', sharedWith: '' },
      { order: 45, skillTree: 'Bottom Fishing', skill: 'Using a paternoster rig', unlockAt: '25%', points: '3/3', sharedWith: '' },
      { order: 46, skillTree: 'Bottom Fishing', skill: 'Use of a classic hair rig', unlockAt: '35%', points: '3/3', sharedWith: '' },
      { order: 47, skillTree: 'Bottom Fishing', skill: 'Fishing with a picker rod', unlockAt: '40%', points: '7/7', sharedWith: '' },
      { order: 48, skillTree: 'Bottom Fishing', skill: 'Using Bait Slingshot', unlockAt: '45%', points: '3/3', sharedWith: '' },
      { order: 49, skillTree: 'Bottom Fishing', skill: 'Using an in-line rig', unlockAt: '50%', points: '3/3', sharedWith: '' },
      { order: 50, skillTree: 'Bottom Fishing', skill: 'Use of Snowman rig', unlockAt: '50%', points: '3/3', sharedWith: '' },
      { order: 51, skillTree: 'Bottom Fishing', skill: 'Casting power control', unlockAt: '55%', points: '---', sharedWith: '' },
      { order: 52, skillTree: 'Bottom Fishing', skill: 'Fishing with a carp rod', unlockAt: '60%', points: '7/7', sharedWith: 'Bottom - Use of spod rods,Bottom - Use of Marker Rods' },
      { order: 53, skillTree: 'Bottom Fishing', skill: 'Using Classic Pop-Up Rig', unlockAt: '60%', points: '3/3', sharedWith: '' },
      { order: 54, skillTree: 'Bottom Fishing', skill: 'Use of a loop rig', unlockAt: '70%', points: '3/3', sharedWith: '' },
      { order: 55, skillTree: 'Bottom Fishing', skill: 'Using Hinged-stiff rig', unlockAt: '75%', points: '3/3', sharedWith: '' },
      { order: 56, skillTree: 'Bottom Fishing', skill: 'Rocket feeder', unlockAt: '80%', points: '3/3', sharedWith: '' },
      { order: 57, skillTree: 'Bottom Fishing', skill: 'Use of Marker Rigging', unlockAt: '80%', points: '3/3', sharedWith: '' },
      { order: 58, skillTree: 'Bottom Fishing', skill: 'Use of spod rods', unlockAt: '80%', points: '7/7', sharedWith: 'Bottom - Fishing with a carp rod,Bottom - Use of Marker Rods' },
      { order: 59, skillTree: 'Bottom Fishing', skill: 'Use of Marker Rods', unlockAt: '80%', points: '7/7', sharedWith: 'Bottom - Fishing with a carp rod,Bottom - Use of spod rods' },
      { order: 60, skillTree: 'Bottom Fishing', skill: 'Use of Cobra', unlockAt: '85%', points: '3/3', sharedWith: '' },
      { order: 61, skillTree: 'Bottom Fishing', skill: 'Using a baitfish bottom rig', unlockAt: '85%', points: '3/3', sharedWith: '' },
      { order: 62, skillTree: 'Bottom Fishing', skill: 'Using the Chod rig', unlockAt: '90%', points: '3/3', sharedWith: '' },
      { order: 63, skillTree: 'Bottom Fishing', skill: 'Using the Classic Method Rig', unlockAt: '90%', points: '3/3', sharedWith: '' },
      { order: 64, skillTree: 'Bottom Fishing', skill: 'Using the Pop-Up Method Rig', unlockAt: '90%', points: '3/3', sharedWith: '' },
      { order: 65, skillTree: 'Bottom Fishing', skill: 'Using the Maggot Snap-In Rig', unlockAt: '95%', points: '3/3', sharedWith: '' },
      { order: 66, skillTree: 'Bottom Fishing', skill: 'Using PVA sticks', unlockAt: '100%', points: '---', sharedWith: '' },
      
      // Marine Fishing
      { order: 67, skillTree: 'Marine Fishing', skill: 'Using a spinning reel', unlockAt: '0%', points: '5/5', sharedWith: 'Spin - Using a spinning reel,Bottom - Using a spinning reel,Float - Using a spinning reel' },
      { order: 68, skillTree: 'Marine Fishing', skill: 'Use of pilker rods', unlockAt: '0%', points: '7/7', sharedWith: 'Marine - Using light boat rods,Marine - Fishing with medium boat rods,Marine - Using heavy marine boat rods' },
      { order: 69, skillTree: 'Marine Fishing', skill: 'Use of pilker rigs', unlockAt: '0%', points: '3/3', sharedWith: '' },
      { order: 70, skillTree: 'Marine Fishing', skill: 'Using marine jigging rigs', unlockAt: '25%', points: '3/3', sharedWith: 'Marine - Using filet rigs,Spin - Jigging' },
      { order: 71, skillTree: 'Marine Fishing', skill: 'Using fillet rigs', unlockAt: '35%', points: '3/3', sharedWith: 'Marine - Using marine jigging rigs' },
      { order: 72, skillTree: 'Marine Fishing', skill: 'Casting power control', unlockAt: '35%', points: '---', sharedWith: '' },
      { order: 73, skillTree: 'Marine Fishing', skill: 'Attraction elements for pilker rigs', unlockAt: '40%', points: '---', sharedWith: '' },
      { order: 74, skillTree: 'Marine Fishing', skill: 'Auxiliary hook for pilker rigs', unlockAt: '50%', points: '---', sharedWith: '' },
      { order: 75, skillTree: 'Marine Fishing', skill: 'Using light conventional reels', unlockAt: '50%', points: '5/5', sharedWith: 'Marine - Using a heavy conventional reel,Spin - Using light conventional reels,Spin - Using a heavy conventional reel' },
      { order: 76, skillTree: 'Marine Fishing', skill: 'Using classic marine bottom rigs', unlockAt: '55%', points: '3/3', sharedWith: 'Marine - Using bottom rigs with rattling sinker' },
      { order: 77, skillTree: 'Marine Fishing', skill: 'Using light boat rods', unlockAt: '55%', points: '7/7', sharedWith: 'Marine - Fishing with medium boat rods,Marine - Using heavy marine boat rods,Marine - Use of pilker rods' },
      { order: 78, skillTree: 'Marine Fishing', skill: 'Using the flying collar rig', unlockAt: '60%', points: '3/3', sharedWith: '' },
      { order: 79, skillTree: 'Marine Fishing', skill: 'Using the marine paternoster', unlockAt: '65%', points: '3/3', sharedWith: '' },
      { order: 80, skillTree: 'Marine Fishing', skill: 'Using bottom rigs with rattling sinker', unlockAt: '70%', points: '3/3', sharedWith: 'Marine - Using classic marine bottom rigs' },
      { order: 81, skillTree: 'Marine Fishing', skill: 'Attraction elements for marine rigs', unlockAt: '70%', points: '---', sharedWith: '' },
      { order: 82, skillTree: 'Marine Fishing', skill: 'Fishing with medium boat rods', unlockAt: '75%', points: '7/7', sharedWith: 'Marine - Using light boat rods,Marine - Using heavy marine boat rods,Marine - Use of pilker rods' },
      { order: 83, skillTree: 'Marine Fishing', skill: 'Use of droppers and dropshots', unlockAt: '75%', points: '---', sharedWith: '' },
      { order: 84, skillTree: 'Marine Fishing', skill: 'Use of Gummi Makk', unlockAt: '80%', points: '---', sharedWith: '' },
      { order: 85, skillTree: 'Marine Fishing', skill: 'Using the giant silicone jigging rig', unlockAt: '85%', points: '3/3', sharedWith: 'Marine - Using the dead fish rig' },
      { order: 86, skillTree: 'Marine Fishing', skill: 'Using the dead fish rig', unlockAt: '85%', points: '3/3', sharedWith: 'Marine - Using the giant silicone jigging rig' },
      { order: 87, skillTree: 'Marine Fishing', skill: 'Using a heavy conventional reel', unlockAt: '90%', points: '5/5', sharedWith: 'Marine - Using light conventional reels,Spin - Using light conventional reels,Spin - Using a heavy conventional reel' },
      { order: 88, skillTree: 'Marine Fishing', skill: 'Second leader for bottom rigs', unlockAt: '90%', points: '---', sharedWith: '' },
      { order: 89, skillTree: 'Marine Fishing', skill: 'Using dead fish bottom rigs', unlockAt: '95%', points: '3/3', sharedWith: '' },
      { order: 90, skillTree: 'Marine Fishing', skill: 'Using heavy marine boat rods', unlockAt: '100%', points: '7/7', sharedWith: 'Marine - Using light boat rods,Marine - Fishing with medium boat rods,Marine - Use of pilker rods' },

      // Harvesting Baits
      { order: 91, skillTree: 'Harvesting Baits', skill: 'Harvesting worms', unlockAt: '0%', points: '3/3', sharedWith: 'All Shovel Skill Points are shared' },
      { order: 92, skillTree: 'Harvesting Baits', skill: 'Harvesting redworms', unlockAt: '0%', points: '3/3', sharedWith: 'All Scoop Skill Points are shared' },
      { order: 93, skillTree: 'Harvesting Baits', skill: 'Preparing wet bread as bait', unlockAt: '0%', points: '---', sharedWith: '' },
      { order: 94, skillTree: 'Harvesting Baits', skill: 'Making potato cubes', unlockAt: '0%', points: '---', sharedWith: '' },
      { order: 95, skillTree: 'Harvesting Baits', skill: 'Making pearl barley porridge', unlockAt: '20%', points: '---', sharedWith: '' },
      { order: 96, skillTree: 'Harvesting Baits', skill: 'Making oatmeal porridge', unlockAt: '20%', points: '---', sharedWith: '' },
      { order: 97, skillTree: 'Harvesting Baits', skill: 'Making sweet dough', unlockAt: '25%', points: '---', sharedWith: '' },
      { order: 98, skillTree: 'Harvesting Baits', skill: 'Making wheat grains', unlockAt: '25%', points: '---', sharedWith: '' },
      { order: 99, skillTree: 'Harvesting Baits', skill: 'Making semolina porridge', unlockAt: '30%', points: '---', sharedWith: '' },
      { order: 100, skillTree: 'Harvesting Baits', skill: 'Making garlic dough', unlockAt: '35%', points: '---', sharedWith: '' },
      { order: 101, skillTree: 'Harvesting Baits', skill: 'Making cheese cubes', unlockAt: '35%', points: '---', sharedWith: '' },
      { order: 102, skillTree: 'Harvesting Baits', skill: 'Making cottage cheese dough', unlockAt: '40%', points: '---', sharedWith: '' },
      { order: 103, skillTree: 'Harvesting Baits', skill: 'Making pea porridge', unlockAt: '40%', points: '---', sharedWith: '' },
      { order: 104, skillTree: 'Harvesting Baits', skill: 'Harvesting bloodworms', unlockAt: '45%', points: '3/3', sharedWith: 'All Scoop Skill Points are shared' },
      { order: 105, skillTree: 'Harvesting Baits', skill: 'Harvesting aquatic plants', unlockAt: '45%', points: '3/3', sharedWith: 'All Scoop Skill Points are shared' },
      { order: 106, skillTree: 'Harvesting Baits', skill: 'Making egg dough', unlockAt: '45%', points: '---', sharedWith: '' },
      { order: 107, skillTree: 'Harvesting Baits', skill: 'Harvesting fish meat', unlockAt: '50%', points: '---', sharedWith: '' },
      { order: 108, skillTree: 'Harvesting Baits', skill: 'Making cornmeal porridge', unlockAt: '50%', points: '---', sharedWith: '' },
      { order: 109, skillTree: 'Harvesting Baits', skill: 'Harvesting mayfly larvae', unlockAt: '55%', points: '3/3', sharedWith: 'All Scoop Skill Points are shared' },
      { order: 110, skillTree: 'Harvesting Baits', skill: 'Making honey dough', unlockAt: '55%', points: '---', sharedWith: '' },
      { order: 111, skillTree: 'Harvesting Baits', skill: 'Harvesting frogs', unlockAt: '60%', points: '---', sharedWith: '' },
      { order: 112, skillTree: 'Harvesting Baits', skill: 'Fish fillet preperation', unlockAt: '60%', points: '---', sharedWith: '' },
      { order: 113, skillTree: 'Harvesting Baits', skill: 'Harvesting baitfish', unlockAt: '65%', points: '---', sharedWith: '' },
      { order: 114, skillTree: 'Harvesting Baits', skill: 'Dead fish preperation', unlockAt: '65%', points: '---', sharedWith: '' },
      { order: 115, skillTree: 'Harvesting Baits', skill: 'Crafting squid meat', unlockAt: '70%', points: '---', sharedWith: '' },
      { order: 116, skillTree: 'Harvesting Baits', skill: 'Harvesting caddisfly larvae', unlockAt: '70%', points: '3/3', sharedWith: 'All Scoop Skill Points are shared' },
      { order: 117, skillTree: 'Harvesting Baits', skill: 'Harvesting nightcrawlers', unlockAt: '75%', points: '3/3', sharedWith: 'All Shovel Skill Points are shared' },
      { order: 118, skillTree: 'Harvesting Baits', skill: 'Harvesting leeches', unlockAt: '80%', points: '3/3', sharedWith: 'All Scoop Skill Points are shared' },
      { order: 119, skillTree: 'Harvesting Baits', skill: 'Harvesting dung beetles', unlockAt: '80%', points: '3/3', sharedWith: 'All Shovel Skill Points are shared' },
      { order: 120, skillTree: 'Harvesting Baits', skill: 'Harvesting cockchafer larvae', unlockAt: '90%', points: '3/3', sharedWith: 'All Shovel Skill Points are shared' },
      { order: 121, skillTree: 'Harvesting Baits', skill: 'Harvesting mole crickets', unlockAt: '95%', points: '3/3', sharedWith: 'All Shovel Skill Points are shared' },
      { order: 122, skillTree: 'Harvesting Baits', skill: 'Harvesting water beetles', unlockAt: '100%', points: '3/3', sharedWith: 'All Scoop Skill Points are shared' },
      { order: 123, skillTree: 'Harvesting Baits', skill: 'Harvesting freshwater gammarus', unlockAt: '100%', points: '3/3', sharedWith: 'All Scoop Skill Points are shared' },
      { order: 124, skillTree: 'Harvesting Baits', skill: 'Harvesting rhinoceros beetle larvae', unlockAt: '100%', points: '3/3', sharedWith: 'All Shovel Skill Points are shared' },
      { order: 125, skillTree: 'Harvesting Baits', skill: 'Harvesting crayfish meat', unlockAt: '100%', points: '---', sharedWith: '' },
      { order: 126, skillTree: 'Harvesting Baits', skill: 'Harvesting of crab meat', unlockAt: '100%', points: '---', sharedWith: '' },
      { order: 127, skillTree: 'Harvesting Baits', skill: 'Harvesting of mussel meat', unlockAt: '100%', points: '---', sharedWith: '' },
      { order: 128, skillTree: 'Harvesting Baits', skill: 'Harvesting mussel meat', unlockAt: '100%', points: '---', sharedWith: '' },

      // Cooking
      { order: 129, skillTree: 'Cooking', skill: 'Dried fish', unlockAt: '0%', points: '---', sharedWith: '' },
      { order: 130, skillTree: 'Cooking', skill: 'Baked potato', unlockAt: '0%', points: '---', sharedWith: '' },
      { order: 131, skillTree: 'Cooking', skill: 'Tea', unlockAt: '0%', points: '---', sharedWith: '' },
      { order: 132, skillTree: 'Cooking', skill: 'Coffee', unlockAt: '0%', points: '---', sharedWith: '' },
      { order: 133, skillTree: 'Cooking', skill: 'Cocoa', unlockAt: '0%', points: '---', sharedWith: '' },
      { order: 134, skillTree: 'Cooking', skill: 'Boiled egg', unlockAt: '0%', points: '---', sharedWith: '' },
      { order: 135, skillTree: 'Cooking', skill: 'Sausage on a stick', unlockAt: '0%', points: '---', sharedWith: '' },
      { order: 136, skillTree: 'Cooking', skill: 'Marshmellow on a stick', unlockAt: '0%', points: '---', sharedWith: '' },
      { order: 137, skillTree: 'Cooking', skill: 'Macaroni Russian Navy Style', unlockAt: '10%', points: '---', sharedWith: '' },
      { order: 138, skillTree: 'Cooking', skill: 'Freshly pickled cucumbers', unlockAt: '10%', points: '---', sharedWith: '' },
      { order: 139, skillTree: 'Cooking', skill: 'Baked potatoes with fish', unlockAt: '15%', points: '---', sharedWith: '' },
      { order: 140, skillTree: 'Cooking', skill: 'Fried fish', unlockAt: '20%', points: '---', sharedWith: '' },
      { order: 141, skillTree: 'Cooking', skill: 'Shish kebab', unlockAt: '30%', points: '---', sharedWith: '' },
      { order: 142, skillTree: 'Cooking', skill: 'Baked apples', unlockAt: '30%', points: '---', sharedWith: '' },
      { order: 143, skillTree: 'Cooking', skill: 'Mulled wine', unlockAt: '30%', points: '---', sharedWith: '' },
      { order: 144, skillTree: 'Cooking', skill: 'Pike cutlets', unlockAt: '40%', points: '---', sharedWith: '' },
      { order: 145, skillTree: 'Cooking', skill: 'Fried potatoes with bacon', unlockAt: '40%', points: '---', sharedWith: '' },
      { order: 146, skillTree: 'Cooking', skill: 'Russian pancakes', unlockAt: '45%', points: '---', sharedWith: '' },
      { order: 147, skillTree: 'Cooking', skill: 'Smoked fish', unlockAt: '50%', points: '---', sharedWith: '' },
      { order: 148, skillTree: 'Cooking', skill: 'Salmon steak', unlockAt: '55%', points: '---', sharedWith: '' },
      { order: 149, skillTree: 'Cooking', skill: 'Siberian ravioli', unlockAt: '60%', points: '---', sharedWith: '' },
      { order: 150, skillTree: 'Cooking', skill: 'Boiled crayfish', unlockAt: '65%', points: '---', sharedWith: '' },
      { order: 151, skillTree: 'Cooking', skill: 'Caviar', unlockAt: '70%', points: '---', sharedWith: '' },
      { order: 152, skillTree: 'Cooking', skill: 'Buckwheat porridge with burbot liver', unlockAt: '75%', points: '---', sharedWith: '' },
      { order: 153, skillTree: 'Cooking', skill: 'Homemade wine', unlockAt: '80%', points: '---', sharedWith: '' },
      { order: 154, skillTree: 'Cooking', skill: 'Apple Cider', unlockAt: '80%', points: '---', sharedWith: '' },
      { order: 155, skillTree: 'Cooking', skill: 'Potato moonshine', unlockAt: '85%', points: '---', sharedWith: '' },
      { order: 156, skillTree: 'Cooking', skill: 'Bread wine', unlockAt: '90%', points: '---', sharedWith: '' },
      { order: 157, skillTree: 'Cooking', skill: 'Fish soup', unlockAt: '100%', points: '---', sharedWith: '' },

      // Making Groundbait
      { order: 158, skillTree: 'Making Groundbait', skill: 'Mixing a groundbait', unlockAt: '0%', points: '5/5', sharedWith: '' },
      { order: 159, skillTree: 'Making Groundbait', skill: 'Basic level components', unlockAt: '0%', points: '---', sharedWith: '' },
      { order: 160, skillTree: 'Making Groundbait', skill: '2nd level components', unlockAt: '15%', points: '---', sharedWith: '' },
      { order: 161, skillTree: 'Making Groundbait', skill: '3rd level components', unlockAt: '30%', points: '---', sharedWith: '' },
      { order: 162, skillTree: 'Making Groundbait', skill: '4th level components', unlockAt: '40%', points: '---', sharedWith: '' },
      { order: 163, skillTree: 'Making Groundbait', skill: '5th level components', unlockAt: '50%', points: '---', sharedWith: '' },
      { order: 164, skillTree: 'Making Groundbait', skill: '6th level components', unlockAt: '60%', points: '---', sharedWith: '' },
      { order: 165, skillTree: 'Making Groundbait', skill: '7th level components', unlockAt: '70%', points: '---', sharedWith: '' },
      { order: 166, skillTree: 'Making Groundbait', skill: '8th level components', unlockAt: '75%', points: '---', sharedWith: '' },
      { order: 167, skillTree: 'Making Groundbait', skill: '9th level components', unlockAt: '80%', points: '---', sharedWith: '' },
      { order: 168, skillTree: 'Making Groundbait', skill: '10th level components', unlockAt: '85%', points: '---', sharedWith: '' },
      { order: 169, skillTree: 'Making Groundbait', skill: '11th level components', unlockAt: '90%', points: '---', sharedWith: '' },
      { order: 170, skillTree: 'Making Groundbait', skill: '12th level components', unlockAt: '95%', points: '---', sharedWith: '' },
      { order: 171, skillTree: 'Making Groundbait', skill: '13th level components', unlockAt: '100%', points: '---', sharedWith: '' },
      { order: 172, skillTree: 'Making Groundbait', skill: 'Making a PVA stick', unlockAt: '100%', points: '---', sharedWith: '' },

      // Making Lures
      { order: 173, skillTree: 'Making Lures', skill: 'Novgorod spoon', unlockAt: '0%', points: '5/5', sharedWith: 'All Metal Lure skill points are shared' },
      { order: 174, skillTree: 'Making Lures', skill: 'Moscow spoon', unlockAt: '0%', points: '5/5', sharedWith: 'All Metal Lure skill points are shared' },
      { order: 175, skillTree: 'Making Lures', skill: 'Foam-rubber fish', unlockAt: '10%', points: '5/5', sharedWith: 'All Metal Lure skill points are shared' },
      { order: 176, skillTree: 'Making Lures', skill: 'Big Lower Volga spoon', unlockAt: '20%', points: '5/5', sharedWith: 'All Metal Lure skill points are shared' },
      { order: 177, skillTree: 'Making Lures', skill: 'Small Lower Volga spoon', unlockAt: '30%', points: '5/5', sharedWith: 'All Metal Lure skill points are shared' },
      { order: 178, skillTree: 'Making Lures', skill: 'Short Serdobsk spoon', unlockAt: '40%', points: '5/5', sharedWith: 'All Metal Lure skill points are shared' },
      { order: 179, skillTree: 'Making Lures', skill: 'Long Serdobsk spoon', unlockAt: '50%', points: '5/5', sharedWith: 'All Metal Lure skill points are shared' },
      { order: 180, skillTree: 'Making Lures', skill: 'Zander spoon', unlockAt: '55%', points: '5/5', sharedWith: 'All Metal Lure skill points are shared' },
      { order: 181, skillTree: 'Making Lures', skill: 'West Siberian round spoon', unlockAt: '60%', points: '5/5', sharedWith: 'All Metal Lure skill points are shared' },
      { order: 182, skillTree: 'Making Lures', skill: 'West Siberian figured spoon', unlockAt: '65%', points: '5/5', sharedWith: 'All Metal Lure skill points are shared' },
      { order: 183, skillTree: 'Making Lures', skill: 'Spinnerbait', unlockAt: '70%', points: '5/5', sharedWith: 'All Metal Lure skill points are shared' },
      { order: 184, skillTree: 'Making Lures', skill: 'Simple unpainted wobbler', unlockAt: '75%', points: '5/5', sharedWith: 'All Wooden Lure Skill Points are shared' },
      { order: 185, skillTree: 'Making Lures', skill: 'Excellent Crank', unlockAt: '80%', points: '5/5', sharedWith: 'All Wooden Lure Skill Points are shared' },
      { order: 186, skillTree: 'Making Lures', skill: 'Excellent minnow', unlockAt: '85%', points: '5/5', sharedWith: 'All Wooden Lure Skill Points are shared' },
      { order: 187, skillTree: 'Making Lures', skill: 'Excellent jointed lure', unlockAt: '90%', points: '5/5', sharedWith: 'All Wooden Lure Skill Points are shared' },
      { order: 188, skillTree: 'Making Lures', skill: 'Popper', unlockAt: '95%', points: '5/5', sharedWith: 'All Wooden Lure Skill Points are shared' },
      { order: 189, skillTree: 'Making Lures', skill: 'Walker', unlockAt: '100%', points: '5/5', sharedWith: 'All Wooden Lure Skill Points are shared' },
      { order: 190, skillTree: 'Making Lures', skill: 'Jerkbait', unlockAt: '100%', points: '5/5', sharedWith: 'All Wooden Lure Skill Points are shared' }
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

  // Create bidirectional shared skill mapping
  const createSharedSkillGroups = () => {
    const skillGroups = [];
    const processedSkills = new Set();

    // First, handle cross-tree shared skills
    Object.keys(skillData).forEach(treeId => {
      const tree = skillData[treeId] || [];
      tree.forEach(skill => {
        const skillKey = `${treeId}-${skill.id}`;
        if (processedSkills.has(skillKey)) return;

        // Skip same-tree shared skills for now
        const specialSharedTypes = [
          'All Shovel Skill Points are shared',
          'All Scoop Skill Points are shared', 
          'All Metal Lure skill points are shared',
          'All Wooden Lure Skill Points are shared'
        ];
        
        if (skill.sharedWith && skill.sharedWith.some(entry => specialSharedTypes.includes(entry))) {
          return; // Handle these separately
        }

        // Find all skills that should be in the same group
        const group = [{ treeId, skillId: skill.id, name: skill.name, sharedWith: skill.sharedWith }];
        processedSkills.add(skillKey);

        // Add skills this one shares with
        if (skill.sharedWith && skill.sharedWith.length > 0) {
          skill.sharedWith.forEach(sharedEntry => {
            if (sharedEntry.includes(' - ')) {
              const [treeName, skillName] = sharedEntry.split(' - ');
              const targetTreeId = getTreeIdFromName(treeName.trim());
              const targetSkill = findSkillByName(targetTreeId, skillName.trim());
              
              if (targetSkill) {
                const targetKey = `${targetTreeId}-${targetSkill.id}`;
                if (!processedSkills.has(targetKey)) {
                  group.push({ treeId: targetTreeId, skillId: targetSkill.id, name: targetSkill.name, sharedWith: targetSkill.sharedWith });
                  processedSkills.add(targetKey);
                }
              }
            }
          });
        }

        // Look for skills that share with this one
        Object.keys(skillData).forEach(otherTreeId => {
          const otherTree = skillData[otherTreeId] || [];
          otherTree.forEach(otherSkill => {
            const otherKey = `${otherTreeId}-${otherSkill.id}`;
            if (processedSkills.has(otherKey)) return;

            if (otherSkill.sharedWith && otherSkill.sharedWith.length > 0 && 
                !otherSkill.sharedWith.some(entry => specialSharedTypes.includes(entry))) {
              const hasReference = otherSkill.sharedWith.some(entry => {
                if (entry.includes(' - ')) {
                  const [treeName, skillName] = entry.split(' - ');
                  const refTreeId = getTreeIdFromName(treeName.trim());
                  return refTreeId === treeId && skillName.trim().toLowerCase() === skill.name.toLowerCase();
                }
                return false;
              });

              if (hasReference) {
                group.push({ treeId: otherTreeId, skillId: otherSkill.id, name: otherSkill.name, sharedWith: otherSkill.sharedWith });
                processedSkills.add(otherKey);
              }
            }
          });
        });

        if (group.length > 1) {
          skillGroups.push(group);
        }
      });
    });

    // Now handle same-tree shared skill groups
    const specialSharedTypes = [
      'All Shovel Skill Points are shared',
      'All Scoop Skill Points are shared', 
      'All Metal Lure skill points are shared',
      'All Wooden Lure Skill Points are shared'
    ];

    Object.keys(skillData).forEach(treeId => {
      const tree = skillData[treeId] || [];
      const sameTreeGroups = {};

      tree.forEach(skill => {
        if (skill.sharedWith && skill.sharedWith.length > 0) {
          const sharedType = skill.sharedWith.find(entry => specialSharedTypes.includes(entry));
          if (sharedType) {
            if (!sameTreeGroups[sharedType]) {
              sameTreeGroups[sharedType] = [];
            }
            sameTreeGroups[sharedType].push({ treeId, skillId: skill.id, name: skill.name, sharedWith: skill.sharedWith });
          }
        }
      });

      // Add each same-tree group to skillGroups
      Object.values(sameTreeGroups).forEach(group => {
        if (group.length > 0) {
          skillGroups.push(group);
        }
      });
    });

    return skillGroups;
  };

  const getTreeIdFromName = (treeName) => {
    const nameMap = {
      'Float': 'float-fishing',
      'Spin': 'spin-fishing',
      'Bottom': 'bottom-fishing',
      'Marine': 'marine-fishing',
      'Harvesting': 'harvesting-baits',
      'Cooking': 'cooking',
      'Making Groundbait': 'making-groundbait',
      'Making Lures': 'making-lures'
    };
    return nameMap[treeName];
  };

  const findSkillByName = (targetTreeId, skillName) => {
    const targetTree = skillData[targetTreeId] || [];
    return targetTree.find(s => s.name.toLowerCase() === skillName.toLowerCase());
  };

  const calculateRequiredLevel = (totalPoints) => {
    // Subtract collection points from total points for level calculation
    const effectivePoints = Math.max(0, totalPoints - collections);
    if (effectivePoints <= 19) return effectivePoints + 1;
    if (effectivePoints <= 39) return 20 + Math.floor((effectivePoints - 19) / 2);
    if (effectivePoints <= 69) return 30 + Math.floor((effectivePoints - 39) / 3);
    return 40 + Math.floor((effectivePoints - 69) / 4);
  };

  const getTotalInvestedPoints = () => {
    const sharedGroups = createSharedSkillGroups();
    const countedSkills = new Set();
    let totalPoints = 0;

    // Count shared skill groups
    sharedGroups.forEach((group, groupIndex) => {
      let groupHasPoints = false;
      let maxPointsInGroup = 0;
      
      // For same-tree shared skills (All X shared), count only once even if multiple skills have points
      const isSpecialShared = group[0].sharedWith && group[0].sharedWith.some(entry => 
        entry === 'All Shovel Skill Points are shared' ||
        entry === 'All Scoop Skill Points are shared' ||
        entry === 'All Metal Lure skill points are shared' ||
        entry === 'All Wooden Lure Skill Points are shared'
      );

      group.forEach(skill => {
        const points = investedPoints[skill.treeId]?.[skill.skillId] || 0;
        if (points > 0) {
          groupHasPoints = true;
          maxPointsInGroup = Math.max(maxPointsInGroup, points);
        }
        countedSkills.add(`${skill.treeId}-${skill.skillId}`);
      });

      if (groupHasPoints) {
        if (isSpecialShared) {
          // For same-tree shared skills, count only the max points once
          totalPoints += maxPointsInGroup;
        } else {
          // For cross-tree shared skills, they should all have the same points
          totalPoints += maxPointsInGroup;
        }
      }
    });

    // Count non-shared skills
    Object.keys(skillData).forEach(treeId => {
      const tree = skillData[treeId] || [];
      const treePoints = investedPoints[treeId] || {};
      
      tree.forEach(skill => {
        const skillKey = `${treeId}-${skill.id}`;
        if (!countedSkills.has(skillKey)) {
          const points = treePoints[skill.id] || 0;
          if (points > 0) {
            totalPoints += points;
          }
        }
      });
    });

    return totalPoints;
  };

  const getTreeProgress = (treeId) => {
    const tree = skillData[treeId] || [];
    const treePoints = investedPoints[treeId] || {};
    const totalInvestableSkills = tree.filter(skill => skill.maxPoints > 0).length;
    const completedSkills = tree.filter(skill => 
      skill.maxPoints > 0 && (treePoints[skill.id] || 0) >= skill.maxPoints
    ).length;
    return totalInvestableSkills > 0 ? (completedSkills / totalInvestableSkills) * 100 : 0;
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
    if (!skill) return;

    const currentPoints = investedPoints[treeId]?.[skillId] || 0;
    if (currentPoints >= skill.maxPoints) return;

    // Find if this skill is part of a shared group
    const sharedGroups = createSharedSkillGroups();
    const skillGroup = sharedGroups.find(group => 
      group.some(s => s.treeId === treeId && s.skillId === skillId)
    );

    const updates = {};

    if (skillGroup) {
      // Update all skills in the shared group
      skillGroup.forEach(sharedSkill => {
        const sharedCurrentPoints = investedPoints[sharedSkill.treeId]?.[sharedSkill.skillId] || 0;
        const sharedTree = skillData[sharedSkill.treeId] || [];
        const sharedSkillData = sharedTree.find(s => s.id === sharedSkill.skillId);
        
        if (sharedSkillData && sharedCurrentPoints < sharedSkillData.maxPoints) {
          if (!updates[sharedSkill.treeId]) {
            updates[sharedSkill.treeId] = { ...investedPoints[sharedSkill.treeId] };
          }
          updates[sharedSkill.treeId][sharedSkill.skillId] = sharedCurrentPoints + 1;
        }
      });
    } else {
      // Handle special "All X shared" cases within the same tree
      if (skill.sharedWith && skill.sharedWith.length > 0) {
        const specialSharedTypes = [
          'All Shovel Skill Points are shared',
          'All Scoop Skill Points are shared', 
          'All Metal Lure skill points are shared',
          'All Wooden Lure Skill Points are shared'
        ];

        const hasSpecialSharing = skill.sharedWith.some(entry => specialSharedTypes.includes(entry));
        
        if (hasSpecialSharing) {
          const sameTree = skillData[treeId] || [];
          sameTree.forEach(otherSkill => {
            if (otherSkill.id !== skillId && 
                otherSkill.sharedWith && 
                otherSkill.sharedWith.some(entry => skill.sharedWith.includes(entry)) &&
                otherSkill.maxPoints > 0) {
              
              const otherCurrentPoints = investedPoints[treeId]?.[otherSkill.id] || 0;
              if (otherCurrentPoints < otherSkill.maxPoints) {
                if (!updates[treeId]) {
                  updates[treeId] = { ...investedPoints[treeId] };
                }
                updates[treeId][otherSkill.id] = otherCurrentPoints + 1;
              }
            }
          });
        }
      }

      // Apply point to the current skill
      if (!updates[treeId]) {
        updates[treeId] = { ...investedPoints[treeId] };
      }
      updates[treeId][skillId] = currentPoints + 1;
    }

    // Apply all updates at once
    setInvestedPoints(prev => ({
      ...prev,
      ...updates
    }));
  };

  const removePoint = (treeId, skillId) => {
    const tree = skillData[treeId] || [];
    const skill = tree.find(s => s.id === skillId);
    if (!skill) return;

    const currentPoints = investedPoints[treeId]?.[skillId] || 0;
    if (currentPoints <= 0) return;

    // Find if this skill is part of a shared group
    const sharedGroups = createSharedSkillGroups();
    const skillGroup = sharedGroups.find(group => 
      group.some(s => s.treeId === treeId && s.skillId === skillId)
    );

    const updates = {};

    if (skillGroup) {
      // Update all skills in the shared group
      skillGroup.forEach(sharedSkill => {
        const sharedCurrentPoints = investedPoints[sharedSkill.treeId]?.[sharedSkill.skillId] || 0;
        
        if (sharedCurrentPoints > 0) {
          if (!updates[sharedSkill.treeId]) {
            updates[sharedSkill.treeId] = { ...investedPoints[sharedSkill.treeId] };
          }
          updates[sharedSkill.treeId][sharedSkill.skillId] = sharedCurrentPoints - 1;
        }
      });
    } else {
      // Handle special "All X shared" cases within the same tree
      if (skill.sharedWith && skill.sharedWith.length > 0) {
        const specialSharedTypes = [
          'All Shovel Skill Points are shared',
          'All Scoop Skill Points are shared', 
          'All Metal Lure skill points are shared',
          'All Wooden Lure Skill Points are shared'
        ];

        const hasSpecialSharing = skill.sharedWith.some(entry => specialSharedTypes.includes(entry));
        
        if (hasSpecialSharing) {
          const sameTree = skillData[treeId] || [];
          sameTree.forEach(otherSkill => {
            if (otherSkill.id !== skillId && 
                otherSkill.sharedWith && 
                otherSkill.sharedWith.some(entry => skill.sharedWith.includes(entry)) &&
                otherSkill.maxPoints > 0) {
              
              const otherCurrentPoints = investedPoints[treeId]?.[otherSkill.id] || 0;
              if (otherCurrentPoints > 0) {
                if (!updates[treeId]) {
                  updates[treeId] = { ...investedPoints[treeId] };
                }
                updates[treeId][otherSkill.id] = otherCurrentPoints - 1;
              }
            }
          });
        }
      }

      // Remove point from the current skill
      if (!updates[treeId]) {
        updates[treeId] = { ...investedPoints[treeId] };
      }
      updates[treeId][skillId] = currentPoints - 1;
    }

    // Apply all updates at once
    setInvestedPoints(prev => ({
      ...prev,
      ...updates
    }));
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
                {skillTrees.find(t => t.id === treeId)?.name}
              </h1>
            </div>
            <div className="text-xl font-bold">
              Total Points Used: <span className="text-green-400">{getTotalInvestedPoints()}</span>
            </div>
          </div>

          {/* Required Level Display and Instructions */}
          <div className="mb-6 text-center">
            <span className="text-lg">
              Required Level: <span className="text-yellow-400 font-bold">
                {calculateRequiredLevel(getTotalInvestedPoints())}
              </span>
            </span>
            <div className="mt-2 text-sm text-gray-400">
              Left click to add points • Right click to remove points
            </div>
          </div>

          {/* Skill Grid */}
          <div className="grid grid-cols-7 gap-4">
            {gridLayout.map((skill, index) => {
              const invested = treePoints[skill.id] || 0;
              const isMaxed = invested >= skill.maxPoints;
              const canInvest = !isMaxed && skill.maxPoints > 0;
              const canRemove = invested > 0;
              
              return (
                <div key={skill.id} className="flex flex-col items-center">
                  <button
                    onClick={() => investPoint(treeId, skill.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (canRemove) {
                        removePoint(treeId, skill.id);
                      }
                    }}
                    disabled={!canInvest && !canRemove}
                    className={`
                      w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center text-lg font-bold
                      transition-all duration-200 relative
                      ${invested > 0 
                        ? 'bg-green-600 border-green-400 text-white' 
                        : skill.maxPoints > 0
                          ? 'bg-gray-700 border-gray-500 text-gray-300 hover:border-gray-400'
                          : ''
                      }
                      ${(canInvest || canRemove) ? 'hover:scale-105 cursor-pointer' : ''}
                    `}
                    style={skill.maxPoints === 0 ? {
                      backgroundColor: '#004526',
                      borderColor: '#006400',
                      color: 'white'
                    } : {}}
                  >
                    {skill.maxPoints > 0 ? (
                      <>
                        <span className="text-sm">{invested}</span>
                        <span className="text-xs text-gray-300">({skill.unlockAt})</span>
                      </>
                    ) : (
                      <span className="text-xs">{skill.unlockAt}</span>
                    )}
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
          <h1 className="text-3xl font-bold mb-4">Skill Trees</h1>
          
          <div className="text-xl">
            Total Level: <span className="text-yellow-400 font-bold">
              {calculateRequiredLevel(getTotalInvestedPoints())}
            </span>
            <span className="ml-6">
              Total Points Used: <span className="text-green-400 font-bold">{getTotalInvestedPoints()}</span>
            </span>
            <span className="ml-6">
              Collections: <input
                type="number"
                min="0"
                max="99"
                value={collections}
                onChange={(e) => setCollections(Math.max(0, parseInt(e.target.value) || 0))}
                onFocus={(e) => e.target.select()}
                className="bg-gray-700 text-white px-1 py-0.5 rounded border border-gray-600 w-12 text-center focus:outline-none focus:border-blue-500 ml-2 text-sm"
                style={{
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield'
                }}
              />
            </span>
          </div>
        </div>

        {/* Skill Trees Grid - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
          {skillTrees.map((tree) => (
            <button
              key={tree.id}
              onClick={() => setSelectedTree(tree.id)}
              className="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:border-gray-400 transition-colors text-center w-64"
            >
              <div className="mb-2">
                <img src={tree.icon} alt={tree.name} className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-sm font-bold mb-2">{tree.name}</h3>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Total skills: <span className="text-blue-400">{(skillData[tree.id] || []).length}</span></div>
                <div>Investable skills: <span className="text-green-400">{getUnlockedAbilities(tree.id)} / {(skillData[tree.id] || []).filter(s => s.maxPoints > 0).length}</span></div>
                <div>Invested points: <span className="text-yellow-400">{getTotalTreePoints(tree.id)}</span></div>
              </div>
            </button>
          ))}
        </div>

        {/* Share Button - Bottom of page */}
        <div className="mt-8 text-center">
          <button
            onClick={shareSkillBuild}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 mx-auto"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Skill Build</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkillTrees;