import React, { useEffect, useRef } from 'react';
import { ExternalLink, Globe, Users, BookOpen, Video, Gamepad2 } from 'lucide-react';

const Links = () => {
  const containerRef = useRef(null);

  const linkCategories = [
    {
      title: "Top Links",
      icon: <Globe className="w-5 h-5" />,
      links: [
        { name: "KiltedJock's MegaSheet - Comprehensive RF4 Data", url: "https://docs.google.com/spreadsheets/d/1zP41qcHAHKnqYV4r6JuJ5vrqMeux2FLN9pLY3C54_Uc/edit#gid=1797575251" },
        { name: "RF4 Records Stats Website - Find Baits Here", url: "https://rf4records.com/" },
        { name: "Russian RF4 Records Stats Website", url: "https://en.rf4-stat.ru" },
        { name: "RF4 Chinese Heat Map", url: "https://rf4db.com/en" },
        { name: "RF4 Trophies - VK Posts Translated and Aggregated", url: "http://rf4trophies.com" },
        { name: "Chinese RF4 Wiki", url: "https://www.gamekee.com/rf4" },
        { name: "RF4 Baitfinder", url: "https://voxin.me/baitfinder.php" }
      ]
    },
    {
      title: "VK Links",
      icon: <Globe className="w-5 h-5" />,
      links: [
        { name: "Mosquito Lake", url: "https://vk.com/wall-161310162?q=%23%D0%BA%D0%BE%D0%BC%D0%B0%D1%80%D0%B8%D0%BD%D0%BE%D0%B5" },
        { name: "Elk Lake", url: "https://vk.com/wall-161310162?q=%23%D0%BB%D0%BE%D1%81%D0%B8%D0%BD%D0%BE%D0%B5" },
        { name: "Winding Rivulet", url: "https://vk.com/wall-161310162?q=%23%D0%B2%D1%8C%D1%8E%D0%BD%D0%BE%D0%BA" },
        { name: "Old Burg", url: "https://vk.com/wall-161310162?q=%23%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B3" },
        { name: "Belaya", url: "https://vk.com/wall-161310162?q=%23%D0%B1%D0%B5%D0%BB%D0%B0%D1%8F" },
        { name: "Kouri Lake", url: "https://vk.com/wall-161310162?q=%23%D0%BA%D1%83%D0%BE%D1%80%D0%B8" },
        { name: "Bear Lake", url: "https://vk.com/wall-161310162?q=%23%D0%BC%D0%B5%D0%B4%D0%B2%D0%B5%D0%B6%D1%8C%D0%B5" },
        { name: "Volkhov River", url: "https://vk.com/wall-161310162?q=%23%D0%B2%D0%BE%D0%BB%D1%85%D0%BE%D0%B2" },
        { name: "Seversky Donets River", url: "https://vk.com/wall-161310162?q=%23%D0%B4%D0%BE%D0%BD%D0%B5%D1%86" },
        { name: "Sura River", url: "https://vk.com/wall-161310162?q=%23%D1%81%D1%83%D1%80%D0%B0" },
        { name: "Ladoga Lake", url: "https://vk.com/wall-161310162?q=%23%D0%BB%D0%B0%D0%B4%D0%BE%D0%B6%D1%81%D0%BA%D0%BE%D0%B5" },
        { name: "The Amber Lake", url: "https://vk.com/wall-161310162?q=%23%D1%8F%D0%BD%D1%82%D0%B0%D1%80%D0%BD%D0%BE%D0%B5" },
        { name: "Ladoga Archipelago", url: "https://vk.com/wall-161310162?q=%23%D0%B0%D1%80%D1%85%D0%B8%D0%BF%D0%B5%D0%BB%D0%B0%D0%B3" },
        { name: "Akhtuba River", url: "https://vk.com/wall-161310162?q=%23%D0%B0%D1%85%D1%82%D1%83%D0%B1%D0%B0" },
        { name: "Copper Lake", url: "https://vk.com/wall-161310162?q=%23%D0%BC%D0%B5%D0%B4%D0%BD%D0%BE%D0%B5" },
        { name: "Lower Tunguska River", url: "https://vk.com/wall-161310162?q=%23%D1%82%D1%83%D0%BD%D0%B3%D1%83%D1%81%D0%BA%D0%B0" },
        { name: "Yama River", url: "https://vk.com/wall-161310162?q=%23%D1%8F%D0%BC%D0%B0" },
        { name: "Norwegian Sea", url: "https://vk.com/wall-161310162?q=%23%D0%BD%D0%BE%D1%80%D0%B2%D0%B5%D0%B6%D1%81%D0%BA%D0%BE%D0%B5" },
        { name: "China Hotspots", url: "https://vk.com/rf4chinaspot" },
        { name: "China Hotspots (Alternative)", url: "https://vk.com/pp4farmtrof" }
      ]
    },
    {
      title: "Discord Communities",
      icon: <Users className="w-5 h-5" />,
      links: [
        { name: "RF4 Active Spots Discord", url: "https://discord.gg/SvBvkKXeb6" },
        { name: "RF4 Official Discord", url: "https://discord.gg/vwbvVqP" }
      ]
    },
    {
      title: "Spots & Information",
      icon: <Gamepad2 className="w-5 h-5" />,
      links: [
        { name: "VK - Spots Sharing (Russian/Need to Use Page Translate)", url: "https://vk.com/pp4wikipedia" },
        { name: "User Submitted Spots and Knowledge Base/Maps", url: "https://rufish4.ru/en" }
      ]
    },
    {
      title: "Translation Tools",
      icon: <Globe className="w-5 h-5" />,
      links: [
        { name: "Image Translator (Use for Screenshots of Foreign GB/PVA/etc)", url: "https://translate.yandex.com/ocr" },
        { name: "Google Translate Image (Use for Screenshots of Foreign GB/PVA/etc)", url: "https://translate.google.com/?sl=ru&tl=en&op=images" }
      ]
    },
    {
      title: "RF4 Staff Guides",
      icon: <BookOpen className="w-5 h-5" />,
      links: [
        { name: "2024 Dev Q&A", url: "https://rf4game.com/forum/index.php?/topic/32605-dev-faq-2024/" },
        { name: "2023 Dev Q&A", url: "https://rf4game.com/forum/index.php?/topic/31019-dev-qa-2023-ru-region-translation/" },
        { name: "2022 Dev Q&A", url: "https://rf4game.com/forum/index.php?/topic/27621-developer-q-and-a/&tab=comments#comment-60662" },
        { name: "2021 Dev FAQ", url: "https://rf4game.com/forum/index.php?/topic/14570-faq-gameplay/" },
        { name: "Repairs", url: "https://rf4game.com/forum/index.php?/topic/885-levos-guide-repairs/" },
        { name: "Wear on Reels", url: "https://rf4game.com/forum/index.php?/topic/267-levos-guide-wear-on-reels/" },
        { name: "Gear Setups and Choices", url: "https://rf4game.com/forum/index.php?/topic/254-levos-guide-setup-suggestions/" },
        { name: "Spinning for Beginners", url: "https://rf4game.com/forum/index.php?/topic/1583-spinning-for-beginners-basics-types-of-lures-retrieval-methods-and-ul" },
        { name: "Choosing a Lure For Predators", url: "https://rf4game.com/forum/index.php?/topic/2537-guide-choose-the-right-lure" },
        { name: "Groundbait", url: "https://rf4game.com/forum/index.php?/topic/2659-guide-groundbait-how-does-it-work/#comment-26048" },
        { name: "Weekly Records", url: "https://rf4game.com/forum/index.php?/topic/2572-guide-weekly-records/" }
      ]
    },
    {
      title: "Player Guides",
      icon: <BookOpen className="w-5 h-5" />,
      links: [
        { name: "Beluga/Keluga Fishing", url: "https://rf4game.com/forum/index.php?/topic/26290-how-to-fish-beluga-kaluga-guide/" },
        { name: "MDawg Long Form Leveling 2020", url: "https://tinyurl.com/2k9e9cta" },
        { name: "MDawg Long Form Leveling 2022", url: "https://tinyurl.com/4yvcdt6w" },
        { name: "Midnight Gaming With Mystic Nightmare's Tutorials", url: "https://tinyurl.com/ycx4dkdx" },
        { name: "Lure Making Power Leveling", url: "https://rf4game.com/forum/index.php?/topic/26191-guide-lure-making-power-leveling/" },
        { name: "Potryasovgame Infographics", url: "https://imgur.com/a/RGyBHWv" },
        { name: "Potryasovgame Info", url: "https://potryas9.wixsite.com/mysite" }
      ]
    },
    {
      title: "Streamers & Content Creators",
      icon: <Video className="w-5 h-5" />,
      links: [
        { name: "MDawgGaming (Twitch)", url: "https://www.twitch.tv/mdawggaming" },
        { name: "Tretika (Twitch)", url: "https://www.twitch.tv/tretika" },
        { name: "Dave Tormala (YouTube)", url: "https://www.youtube.com/c/DaveTormala" },
        { name: "xiix_denise_xiix (Twitch)", url: "https://www.twitch.tv/xiix_denise_xiix" },
        { name: "mur1cajake (Twitch)", url: "https://www.twitch.tv/mur1cajake" },
        { name: "rangler8 (Twitch)", url: "https://www.twitch.tv/rangler8" },
        { name: "cypher_x9 (Twitch)", url: "https://www.twitch.tv/cypher_x9" }
      ]
    },
    {
      title: "Additional Resources",
      icon: <Globe className="w-5 h-5" />,
      links: [
        { name: "RF4 Official User Guide", url: "https://rf4game.com/userguide/" },
        { name: "RF4 Waterbodies Guides", url: "https://rf4game.com/forum/index.php?/forum/195-waterbodies/" },
        { name: "RF4 Forum Hotspots Rework Page", url: "https://rf4game.com/forum/index.php?/topic/27843-hotspots-reworks/" },
        { name: "Chinese Baidu RF4 Forum", url: "https://tieba.baidu.com/f?kw=%E4%BF%84%E7%BD%97%E6%96%AF%E9%92%93%E9%B1%BC4&ie=utf-8" },
        { name: "RF4 BiliBili - Pikehunter Captain - Reel Stats", url: "https://space.bilibili.com/118535546/dynamic" }
      ]
    }
  ];

  useEffect(() => {
    const handleMasonryLayout = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const items = Array.from(container.children);
      const gap = 24; // 6 * 4px = 24px gap
      
      // Get container width and calculate column width
      const containerWidth = container.offsetWidth;
      const columns = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;
      const columnWidth = (containerWidth - (columns - 1) * gap) / columns;
      
      // Reset container height
      container.style.height = 'auto';
      container.style.position = 'relative';
      
      // Track column heights
      const columnHeights = new Array(columns).fill(0);
      
      items.forEach((item, index) => {
        item.style.position = 'absolute';
        item.style.width = `${columnWidth}px`;
        
        // For first 3 items (top row), use fixed positions
        if (index < 3 && columns === 3) {
          item.style.left = `${index * (columnWidth + gap)}px`;
          item.style.top = '0px';
          columnHeights[index] = item.offsetHeight + gap;
        } else {
          // For remaining items, find the shortest column
          const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
          
          item.style.left = `${shortestColumnIndex * (columnWidth + gap)}px`;
          item.style.top = `${columnHeights[shortestColumnIndex]}px`;
          
          columnHeights[shortestColumnIndex] += item.offsetHeight + gap;
        }
      });
      
      // Set container height to tallest column
      container.style.height = `${Math.max(...columnHeights)}px`;
    };

    // Run layout after render
    const timer = setTimeout(handleMasonryLayout, 100);
    
    // Re-run on window resize
    window.addEventListener('resize', handleMasonryLayout);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleMasonryLayout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            RF4 Useful Links
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            A curated collection of useful Russian Fishing 4 resources, guides, and community links.
          </p>
        </div>

        {/* JavaScript-powered masonry layout with fixed top 3 */}
        <div ref={containerRef} className="relative">
          {linkCategories.map((category, categoryIndex) => (
            <div
              key={categoryIndex}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center mb-3">
                <div className="text-blue-600 dark:text-blue-400 mr-3">
                  {category.icon}
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {category.title}
                </h2>
              </div>
              
              <div className="space-y-1">
                {category.links.map((link, linkIndex) => (
                  <a
                    key={linkIndex}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start group hover:bg-gray-50 dark:hover:bg-gray-700 p-1.5 rounded-md transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 mr-2 flex-shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug">
                      {link.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Links compiled from the RF4 community. Some links may be in Russian - use browser translation as needed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Links; 