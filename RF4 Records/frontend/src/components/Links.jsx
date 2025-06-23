import React from 'react';
import { ExternalLink, Globe, Users, BookOpen, Video, Gamepad2 } from 'lucide-react';

const Links = () => {
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
        { name: "User Submitted Spots and Knowledge Base/Maps", url: "https://rufish4.ru/en" },
        { name: "China Hotspots", url: "https://vk.com/rf4chinaspot" },
        { name: "China Hotspots (Alternative)", url: "https://vk.com/pp4farmtrof" }
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
        { name: "Potryasovgame Info", url: "https://www.potryasovgame.online/" }
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {linkCategories.map((category, categoryIndex) => (
            <div
              key={categoryIndex}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center mb-4">
                <div className="text-blue-600 dark:text-blue-400 mr-3">
                  {category.icon}
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {category.title}
                </h2>
              </div>
              
              <div className="space-y-3">
                {category.links.map((link, linkIndex) => (
                  <a
                    key={linkIndex}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start group hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 mr-2 flex-shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-relaxed">
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