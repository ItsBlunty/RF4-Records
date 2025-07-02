import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Home, X } from 'lucide-react';

const MapViewer = () => {
  // Parse filename to extract coordinate bounds
  const parseMapBounds = (filename) => {
    // Format: "Testmap-1-1-100-100.jpg" -> {minX: 1, minY: 1, maxX: 100, maxY: 100}
    const match = filename.match(/^([^-]+)-(\d+)-(\d+)-(\d+)-(\d+)\./);
    if (match) {
      const [, name, minX, minY, maxX, maxY] = match;
      return {
        name,
        minX: parseInt(minX),
        minY: parseInt(minY),
        maxX: parseInt(maxX),
        maxY: parseInt(maxY)
      };
    }
    return null;
  };

  // Available maps (for now just the test map)
  const availableMaps = [
    'Testmap-1-1-100-100.jpg'
  ];

  const [currentMap, setCurrentMap] = useState(availableMaps[0]);
  const [mapBounds, setMapBounds] = useState(() => parseMapBounds(availableMaps[0]));
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMouseOverMap, setIsMouseOverMap] = useState(false);
  
  // Measurement state
  const [markers, setMarkers] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [currentMeasurement, setCurrentMeasurement] = useState(null); // { start: {x, y} }
  
  // Pan and zoom state
  const [transform, setTransform] = useState({
    scale: 1,
    translateX: 0,
    translateY: 0
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartTransform, setDragStartTransform] = useState({ translateX: 0, translateY: 0 });
  
  const mapContainerRef = useRef(null);
  const mapImageRef = useRef(null);

  // Calculate distance between two map coordinates (in meters)
  const calculateDistance = useCallback((coord1, coord2) => {
    const dx = coord2.x - coord1.x;
    const dy = coord2.y - coord1.y;
    const coordDistance = Math.sqrt(dx * dx + dy * dy);
    return coordDistance * 5; // 1 coordinate = 5 meters
  }, []);

  // Format distance for display
  const formatDistance = useCallback((meters) => {
    if (meters < 1000) {
      return `${meters.toFixed(1)}m`;
    } else {
      return `${(meters / 1000).toFixed(2)}km`;
    }
  }, []);

  // Convert map coordinates to SVG coordinates
  const mapToSvgCoords = useCallback((mapCoord) => {
    if (!mapBounds || !mapImageRef.current) return { x: 0, y: 0 };
    
    const img = mapImageRef.current;
    
    // Convert map coordinates to relative position (0-1)
    const relativeX = (mapCoord.x - mapBounds.minX) / (mapBounds.maxX - mapBounds.minX);
    const relativeY = (mapBounds.maxY - mapCoord.y) / (mapBounds.maxY - mapBounds.minY); // Flip Y
    
    // Convert to pixel coordinates within the SVG viewBox (same as image natural dimensions)
    return {
      x: relativeX * img.naturalWidth,
      y: relativeY * img.naturalHeight
    };
  }, [mapBounds]);

  // Alternative: Convert screen coordinates directly to SVG coordinates
  const screenToSvgCoords = useCallback((screenX, screenY) => {
    if (!mapImageRef.current) return { x: 0, y: 0 };
    
    const img = mapImageRef.current;
    const imgRect = img.getBoundingClientRect();
    
    // Get position relative to the image's displayed position
    const x = screenX - imgRect.left;
    const y = screenY - imgRect.top;
    
    // For SVG that matches displayed image size, use direct pixel coordinates
    return { x, y };
  }, []);

  // Convert pixel coordinates to map coordinates (accounting for transforms)
  const pixelToMapCoords = useCallback((pixelX, pixelY) => {
    if (!mapBounds || !mapImageRef.current || !mapContainerRef.current) return { x: 0, y: 0 };
    
    const img = mapImageRef.current;
    const container = mapContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    // Get relative position within the image's actual displayed bounds
    const relativeX = (pixelX - imgRect.left) / imgRect.width;
    const relativeY = (pixelY - imgRect.top) / imgRect.height;
    
    // Convert to map coordinates
    // Note: Image Y coordinates go top-to-bottom, but map coordinates go bottom-to-top
    const mapX = mapBounds.minX + (relativeX * (mapBounds.maxX - mapBounds.minX));
    const mapY = mapBounds.maxY - (relativeY * (mapBounds.maxY - mapBounds.minY));
    
    return {
      x: Math.round(mapX),
      y: Math.round(mapY)
    };
  }, [mapBounds]);

  // Handle mouse movement over the map
  const handleMouseMove = useCallback((e) => {
    if (!mapImageRef.current) return;
    
    const coords = pixelToMapCoords(e.clientX, e.clientY);
    setMouseCoords(coords);
    
    // Update mouse position for floating coordinate box
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    
    // Store the screen coordinates for direct SVG conversion
    setMousePosition(prev => ({
      ...prev,
      screenX: e.clientX,
      screenY: e.clientY
    }));
    
    // Debug: log coordinate conversion
    if (coords.x && coords.y) {
      console.log('Mouse coords:', coords, 'Screen to SVG:', screenToSvgCoords(e.clientX, e.clientY));
    }
    
    // Handle dragging
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setTransform(prev => ({
        ...prev,
        translateX: dragStartTransform.translateX + deltaX,
        translateY: dragStartTransform.translateY + deltaY
      }));
    }
  }, [pixelToMapCoords, isDragging, dragStart, dragStartTransform]);

  // Handle mouse events
  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) {
      // Left click - handle measurements
      e.preventDefault();
      
      if (!mapImageRef.current) return;
      
      const coords = pixelToMapCoords(e.clientX, e.clientY);
      
      if (!currentMeasurement) {
        // Start new measurement
        const newMarker = { id: Date.now(), x: coords.x, y: coords.y };
        setMarkers(prev => [...prev, newMarker]);
        setCurrentMeasurement({ start: coords });
      } else {
        // Complete measurement
        const distance = calculateDistance(currentMeasurement.start, coords);
        const newMeasurement = {
          id: Date.now(),
          start: currentMeasurement.start,
          end: coords,
          distance: distance
        };
        setMeasurements(prev => [...prev, newMeasurement]);
        setCurrentMeasurement(null);
      }
    } else if (e.button === 2) {
      // Right click - handle panning
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragStartTransform({
        translateX: transform.translateX,
        translateY: transform.translateY
      });
    }
  }, [transform.translateX, transform.translateY, currentMeasurement, pixelToMapCoords, calculateDistance]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle context menu to prevent right-click menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault(); // Prevent browser context menu
  }, []);

  const handleMouseEnter = () => {
    setIsMouseOverMap(true);
  };

  const handleMouseLeave = () => {
    setIsMouseOverMap(false);
    // Don't stop dragging on mouse leave - let the global mouseup handle it
  };

  // Zoom functions
  const zoomIn = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 5) // Max zoom 5x
    }));
  };

  const zoomOut = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.1) // Min zoom 0.1x
    }));
  };

  const resetView = () => {
    setTransform({
      scale: 1,
      translateX: 0,
      translateY: 0
    });
  };

  const fitToScreen = () => {
    if (!mapContainerRef.current || !mapImageRef.current) return;
    
    const container = mapContainerRef.current;
    const img = mapImageRef.current;
    
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    const scaleX = containerRect.width / img.naturalWidth;
    const scaleY = containerRect.height / img.naturalHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% of container to leave some margin
    
    setTransform({
      scale,
      translateX: 0,
      translateY: 0
    });
  };

  const clearMeasurements = () => {
    setMarkers([]);
    setMeasurements([]);
    setCurrentMeasurement(null);
  };

  // Handle wheel zoom
  const handleWheel = useCallback((e) => {
    // Only handle wheel events when mouse is over the map
    if (!isMouseOverMap) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const delta = e.deltaY;
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale * zoomFactor))
    }));
  }, [isMouseOverMap]);

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e) => {
        handleMouseMove(e);
      };
      
      const handleGlobalMouseUp = (e) => {
        handleMouseUp();
      };
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.cursor = 'grabbing';
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.body.style.cursor = 'default';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Add wheel event listener to map container
  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    if (!mapContainer) return;

    const wheelHandler = (e) => {
      handleWheel(e);
    };

    mapContainer.addEventListener('wheel', wheelHandler, { passive: false });
    
    return () => {
      mapContainer.removeEventListener('wheel', wheelHandler);
    };
  }, [handleWheel]);

  // Update map bounds when map changes
  useEffect(() => {
    const bounds = parseMapBounds(currentMap);
    setMapBounds(bounds);
    resetView(); // Reset view when switching maps
    clearMeasurements(); // Clear measurements when switching maps
  }, [currentMap]);

  if (!mapBounds) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Invalid Map Format
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Could not parse map coordinates from filename
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              RF4 Map Viewer
            </h1>
            <select 
              value={currentMap} 
              onChange={(e) => setCurrentMap(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {availableMaps.map(map => (
                <option key={map} value={map}>
                  {parseMapBounds(map)?.name || map}
                </option>
              ))}
            </select>
          </div>
          
          {/* Map Info */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Bounds: {mapBounds.minX}:{mapBounds.minY} to {mapBounds.maxX}:{mapBounds.maxY}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Control Panel */}
        <div className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
          <div className="flex flex-col space-y-2">
            <button
              onClick={zoomIn}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={zoomOut}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={resetView}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={fitToScreen}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              title="Fit to Screen"
            >
              <Home className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="border-t border-gray-200 dark:border-gray-600 my-2"></div>
            <button
              onClick={clearMeasurements}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              title="Clear Measurements"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          
          {/* Zoom Level Indicator */}
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {Math.round(transform.scale * 100)}%
            </div>
          </div>
        </div>

        {/* Map Display */}
        <div 
          ref={mapContainerRef}
          className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
        >
          <div 
            style={{
              transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            className="w-full h-full flex items-center justify-center"
          >
            <img
              ref={mapImageRef}
              src={`/images/${currentMap}`}
              alt={`Map: ${mapBounds.name}`}
              className="max-w-none select-none"
              style={{
                imageRendering: 'pixelated', // Preserve crisp edges when zoomed
                maxWidth: 'none',
                maxHeight: 'none'
              }}
              onMouseMove={handleMouseMove}
              onLoad={() => {
                // Auto-fit to screen when image loads
                setTimeout(fitToScreen, 100);
              }}
              onError={(e) => {
                console.error('Failed to load map image:', e);
              }}
              onDragStart={(e) => e.preventDefault()} // Prevent image drag
            />
            
            {/* SVG Overlay for measurements - positioned as overlay on the image */}
            {mapImageRef.current && (
              <svg
                className="absolute pointer-events-none"
                style={{
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  imageRendering: 'pixelated'
                }}
                viewBox={`0 0 ${mapImageRef.current.getBoundingClientRect().width} ${mapImageRef.current.getBoundingClientRect().height}`}
              >
                {/* Markers */}
                {markers.map(marker => {
                  const svgCoord = mapToSvgCoords(marker);
                  return (
                    <circle
                      key={marker.id}
                      cx={svgCoord.x}
                      cy={svgCoord.y}
                      r="8"
                      fill="#ef4444"
                      stroke="#fff"
                      strokeWidth="3"
                    />
                  );
                })}
                
                {/* Completed measurements */}
                {measurements.map(measurement => {
                  const startSvg = mapToSvgCoords(measurement.start);
                  const endSvg = mapToSvgCoords(measurement.end);
                  const midX = (startSvg.x + endSvg.x) / 2;
                  const midY = (startSvg.y + endSvg.y) / 2;
                  
                  // Calculate arrow rotation
                  const angle = Math.atan2(endSvg.y - startSvg.y, endSvg.x - startSvg.x) * 180 / Math.PI;
                  
                  return (
                    <g key={measurement.id}>
                      {/* Line */}
                      <line
                        x1={startSvg.x}
                        y1={startSvg.y}
                        x2={endSvg.x}
                        y2={endSvg.y}
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeDasharray="5,5"
                      />
                      
                      {/* Arrow */}
                      <polygon
                        points="0,-5 10,0 0,5"
                        fill="#3b82f6"
                        transform={`translate(${endSvg.x}, ${endSvg.y}) rotate(${angle})`}
                      />
                      
                      {/* Distance label */}
                      <rect
                        x={midX - 30}
                        y={midY - 15}
                        width="60"
                        height="30"
                        fill="white"
                        stroke="#3b82f6"
                        strokeWidth="1"
                        rx="3"
                      />
                      <text
                        x={midX}
                        y={midY + 5}
                        textAnchor="middle"
                        fontSize="14"
                        fill="#1f2937"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {formatDistance(measurement.distance)}
                      </text>
                    </g>
                  );
                })}
                
                {/* Active measurement line */}
                {currentMeasurement && (
                  <line
                    x1={mapToSvgCoords(currentMeasurement.start).x}
                    y1={mapToSvgCoords(currentMeasurement.start).y}
                    x2={mapToSvgCoords(mouseCoords).x}
                    y2={mapToSvgCoords(mouseCoords).y}
                    stroke="#fbbf24"
                    strokeWidth="2"
                    strokeDasharray="3,3"
                  />
                )}
                
                {/* Debug: Show mouse position as a small circle */}
                {isMouseOverMap && mousePosition.screenX && mousePosition.screenY && (
                  <circle
                    cx={screenToSvgCoords(mousePosition.screenX, mousePosition.screenY).x}
                    cy={screenToSvgCoords(mousePosition.screenX, mousePosition.screenY).y}
                    r="3"
                    fill="#00ff00"
                    stroke="#fff"
                    strokeWidth="1"
                  />
                )}
              </svg>
            )}
          </div>
        </div>

        {/* Floating Coordinate Box */}
        {isMouseOverMap && (
          <div 
            className="absolute pointer-events-none z-20 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm font-mono"
            style={{
              left: mousePosition.x + 15, // Offset from cursor
              top: mousePosition.y - 30,
              transform: mousePosition.x > (mapContainerRef.current?.offsetWidth || 0) - 100 
                ? 'translateX(-100%)' 
                : 'none' // Flip to left side if near right edge
            }}
          >
            <div>{mouseCoords.x}:{mouseCoords.y}</div>
            {currentMeasurement && (
              <div className="text-yellow-300">
                {formatDistance(calculateDistance(currentMeasurement.start, mouseCoords))}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-w-xs">
          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
            Controls
          </h3>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div>• Right-click and drag to pan</div>
            <div>• Mouse wheel to zoom</div>
            <div>• Hover to see coordinates</div>
            <div>• Left-click to measure distances</div>
            <div>• Use buttons to reset view</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapViewer;