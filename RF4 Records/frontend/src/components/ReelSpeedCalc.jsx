import React, { useState, useEffect, useMemo } from 'react';
import { Gauge, ArrowRight } from 'lucide-react';

const MIN_SETTING = 1;
const MAX_SETTING = 50;

const ReelSpeedCalc = () => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reel1Name, setReel1Name] = useState('');
  const [reel1SpeedIndex, setReel1SpeedIndex] = useState(0);
  const [reel1Setting, setReel1Setting] = useState(50);

  const [reel2Name, setReel2Name] = useState('');
  const [reel2SpeedIndex, setReel2SpeedIndex] = useState(0);

  const parseCSVData = (text) => {
    const lines = text.trim().split('\n');
    const reelData = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',');

      if (i < 4 || values.length < 5 || !values[1] || values[1].includes('ОБНОВЛЕНИЕ') ||
          values[1].includes('НАЗВАНИЕ') || values[1].includes('Reel') || values[1].includes('БЕЗЫНЕРЦИОННЫЕ') ||
          values[1].includes('БАЙТКАСТИНГОВЫЕ') || values[1].includes('СИЛОВЫЕ') ||
          values[1] === '' || values[1].includes('НГ IMPERIAL R600')) {
        continue;
      }

      const speeds = [values[14], values[15], values[16], values[17]]
        .map(s => (s || '').trim())
        .filter(s => s && s !== '-' && s !== '?' && !isNaN(parseFloat(s)))
        .map(s => parseFloat(s));

      const uniqueSpeeds = [...new Set(speeds)];

      if (uniqueSpeeds.length === 0) continue;

      reelData.push({
        Name: (values[1] || '').trim(),
        Type: (values[2] || '').trim(),
        Size: (values[3] || '').trim(),
        Speeds: uniqueSpeeds
      });
    }

    return reelData;
  };

  useEffect(() => {
    const loadReels = async () => {
      try {
        const response = await fetch('/data/reels.csv?v=' + Date.now());
        if (!response.ok) {
          throw new Error('Failed to load reel data');
        }
        const text = await response.text();
        const reelData = parseCSVData(text);
        reelData.sort((a, b) => a.Name.localeCompare(b.Name));
        setReels(reelData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadReels();
  }, []);

  const reel1 = useMemo(
    () => reels.find(r => r.Name === reel1Name) || null,
    [reels, reel1Name]
  );

  const reel2 = useMemo(
    () => reels.find(r => r.Name === reel2Name) || null,
    [reels, reel2Name]
  );

  // Reset speed index when reel changes if out of bounds
  useEffect(() => {
    if (reel1 && reel1SpeedIndex >= reel1.Speeds.length) {
      setReel1SpeedIndex(0);
    }
  }, [reel1, reel1SpeedIndex]);

  useEffect(() => {
    if (reel2 && reel2SpeedIndex >= reel2.Speeds.length) {
      setReel2SpeedIndex(0);
    }
  }, [reel2, reel2SpeedIndex]);

  const reel1MaxSpeed = reel1 ? reel1.Speeds[reel1SpeedIndex] : null;
  const reel2MaxSpeed = reel2 ? reel2.Speeds[reel2SpeedIndex] : null;

  const settingNum = Math.max(MIN_SETTING, Math.min(MAX_SETTING, Number(reel1Setting) || 0));

  const targetActualSpeed = reel1MaxSpeed != null
    ? (reel1MaxSpeed * settingNum) / MAX_SETTING
    : null;

  const reel2EquivalentSettingRaw = (targetActualSpeed != null && reel2MaxSpeed)
    ? (targetActualSpeed / reel2MaxSpeed) * MAX_SETTING
    : null;

  const reel2OutOfRange = reel2EquivalentSettingRaw != null && reel2EquivalentSettingRaw > MAX_SETTING;
  const reel2BelowMin = reel2EquivalentSettingRaw != null && reel2EquivalentSettingRaw < MIN_SETTING;

  const reel2EquivalentSettingClamped = reel2EquivalentSettingRaw != null
    ? Math.max(MIN_SETTING, Math.min(MAX_SETTING, reel2EquivalentSettingRaw))
    : null;

  const reel2ActualSpeedAtClamped = (reel2EquivalentSettingClamped != null && reel2MaxSpeed)
    ? (reel2MaxSpeed * reel2EquivalentSettingClamped) / MAX_SETTING
    : null;

  const handleSettingInput = (val) => {
    if (val === '') {
      setReel1Setting('');
      return;
    }
    const n = Number(val);
    if (Number.isNaN(n)) return;
    setReel1Setting(n);
  };

  const handleSettingBlur = () => {
    if (reel1Setting === '' || reel1Setting < MIN_SETTING) {
      setReel1Setting(MIN_SETTING);
    } else if (reel1Setting > MAX_SETTING) {
      setReel1Setting(MAX_SETTING);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading reel data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  const renderSpeedOptions = (reel) => {
    if (!reel || reel.Speeds.length <= 1) return null;
    return (
      <div className="mt-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Retrieve speed (this reel has multiple gears/handles)
        </label>
        <div className="flex flex-wrap gap-2">
          {reel.Speeds.map((s, idx) => {
            const isReel1 = reel === reel1;
            const selectedIdx = isReel1 ? reel1SpeedIndex : reel2SpeedIndex;
            const setIdx = isReel1 ? setReel1SpeedIndex : setReel2SpeedIndex;
            return (
              <button
                key={idx}
                onClick={() => setIdx(idx)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  selectedIdx === idx
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {s.toFixed(2)} m/s
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const reelOption = (reel) => {
    const meta = [reel.Type, reel.Size].filter(Boolean).join(' ');
    return meta ? `${reel.Name} (${meta})` : reel.Name;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Gauge className="w-8 h-8" />
            Reel Speed Calculator
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Pick a reel and a speed setting (1-50), then pick a second reel to see what speed setting will produce the same retrieve speed.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Reel 1 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Reel 1</h2>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reel
            </label>
            <select
              value={reel1Name}
              onChange={(e) => { setReel1Name(e.target.value); setReel1SpeedIndex(0); }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select a reel...</option>
              {reels.map(r => (
                <option key={r.Name} value={r.Name}>{reelOption(r)}</option>
              ))}
            </select>

            {renderSpeedOptions(reel1)}

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Speed setting (1-50)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={MIN_SETTING}
                  max={MAX_SETTING}
                  step={1}
                  value={settingNum}
                  onChange={(e) => setReel1Setting(Number(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  min={MIN_SETTING}
                  max={MAX_SETTING}
                  value={reel1Setting}
                  onChange={(e) => handleSettingInput(e.target.value)}
                  onBlur={handleSettingBlur}
                  className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center"
                />
              </div>
            </div>

            {reel1 && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                <div className="text-gray-700 dark:text-gray-300">
                  Max retrieve (setting 50): <span className="font-medium">{reel1MaxSpeed?.toFixed(2)} m/s</span>
                </div>
                <div className="text-gray-700 dark:text-gray-300">
                  Actual retrieve at setting {settingNum}: <span className="font-medium">{targetActualSpeed?.toFixed(3)} m/s</span>
                </div>
              </div>
            )}
          </div>

          {/* Reel 2 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Reel 2</h2>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reel
            </label>
            <select
              value={reel2Name}
              onChange={(e) => { setReel2Name(e.target.value); setReel2SpeedIndex(0); }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select a reel...</option>
              {reels.map(r => (
                <option key={r.Name} value={r.Name}>{reelOption(r)}</option>
              ))}
            </select>

            {renderSpeedOptions(reel2)}

            {reel2 && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                <div className="text-gray-700 dark:text-gray-300">
                  Max retrieve (setting 50): <span className="font-medium">{reel2MaxSpeed?.toFixed(2)} m/s</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Result */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            Equivalent setting for Reel 2
          </h2>

          {!reel1 || !reel2 ? (
            <p className="text-gray-500 dark:text-gray-400">
              Select both reels above to see the equivalent speed setting.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {reel2EquivalentSettingRaw != null ? reel2EquivalentSettingRaw.toFixed(2) : '-'}
                <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-2">
                  / {MAX_SETTING}
                </span>
              </div>

              {reel2OutOfRange && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                  Reel 2's max retrieve speed ({reel2MaxSpeed?.toFixed(2)} m/s) is lower than the target retrieve speed ({targetActualSpeed?.toFixed(3)} m/s). Even at setting 50, Reel 2 cannot match Reel 1.
                </div>
              )}

              {reel2BelowMin && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                  The equivalent setting is below 1, the lowest possible setting. Reel 2 will retrieve faster than Reel 1 even at setting 1.
                </div>
              )}

              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>
                  Nearest whole setting: <span className="font-medium text-gray-900 dark:text-white">{reel2EquivalentSettingClamped != null ? Math.round(reel2EquivalentSettingClamped) : '-'}</span>
                </div>
                {reel2ActualSpeedAtClamped != null && (
                  <div>
                    Reel 2 retrieve at setting {reel2EquivalentSettingClamped.toFixed(2)}: <span className="font-medium text-gray-900 dark:text-white">{reel2ActualSpeedAtClamped.toFixed(3)} m/s</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p><strong>How it works:</strong> A reel's listed retrieve speed is its speed at setting 50. At any other setting, the actual speed scales linearly: <code>actual = max × (setting / 50)</code>.</p>
            <p>To match Reel 1's retrieve speed on Reel 2: <code>setting2 = setting1 × (max1 / max2)</code>.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelSpeedCalc;
