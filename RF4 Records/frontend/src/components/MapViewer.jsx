import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ZoomIn, ZoomOut, RotateCcw, Home, X, Share2 } from 'lucide-react';

const MapViewer = () => {
  const { mapName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // Parse filename to extract coordinate bounds
  const parseMapBounds = (filename) => {
    // Format: "Testmap-1-1-100-100.jpg" or "Testmap-1.5-2.3-100.7-99.2.jpg"
    // Supports both integers and decimals
    const match = filename.match(/^([^-]+)-([\d.]+)-([\d.]+)-([\d.]+)-([\d.]+)\./);
    if (match) {
      const [, name, minX, minY, maxX, maxY] = match;
      return {
        name,
        minX: parseFloat(minX),
        minY: parseFloat(minY),
        maxX: parseFloat(maxX),
        maxY: parseFloat(maxY)
      };
    }
    return null;
  };

  // Available maps - map from URL name to filename
  const availableMaps = {
    'copper': 'Copper-24-23.5-78-77.png'
  };

  // Get current map from URL or default to first available
  const getCurrentMapFile = () => {
    if (mapName && availableMaps[mapName.toLowerCase()]) {
      return availableMaps[mapName.toLowerCase()];
    }
    return Object.values(availableMaps)[0];
  };

  const [currentMap, setCurrentMap] = useState(getCurrentMapFile());
  const [mapBounds, setMapBounds] = useState(() => parseMapBounds(getCurrentMapFile()));
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMouseOverMap, setIsMouseOverMap] = useState(false);
  
  // Measurement state - store map coordinates only
  const [markers, setMarkers] = useState([]); // { id, mapCoords: {x,y} }
  const [measurements, setMeasurements] = useState([]);
  const [currentMeasurement, setCurrentMeasurement] = useState(null); // { start: {mapCoords} }
  
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

  // Function to convert map coordinates to current screen position
  const mapCoordsToCurrentScreenPos = useCallback((mapCoords) => {
    if (!mapImageRef.current || !mapContainerRef.current || !mapBounds) {
      return { x: 0, y: 0 };
    }

    // This uses the same conversion as the working popup, just in reverse
    const containerRect = mapContainerRef.current.getBoundingClientRect();
    
    // Convert map coords to relative position (0-1)
    const relativeX = (mapCoords.x - mapBounds.minX) / (mapBounds.maxX - mapBounds.minX);
    const relativeY = (mapBounds.maxY - mapCoords.y) / (mapBounds.maxY - mapBounds.minY);
    
    // Get current image bounds
    const imgRect = mapImageRef.current.getBoundingClientRect();
    
    // Convert to screen coordinates relative to container
    const screenX = (imgRect.left - containerRect.left) + (relativeX * imgRect.width);
    const screenY = (imgRect.top - containerRect.top) + (relativeY * imgRect.height);
    
    return { x: screenX, y: screenY };
  }, [mapBounds]);

  // Calculate distance between two map coordinates (in meters)
  const calculateDistance = useCallback((coord1, coord2) => {
    const dx = coord2.x - coord1.x;
    const dy = coord2.y - coord1.y;
    const coordDistance = Math.sqrt(dx * dx + dy * dy);
    return coordDistance * 5; // 1 coordinate = 5 meters
  }, []);

  // Format distance for display
  const formatDistance = useCallback((meters) => {
    const roundedMeters = Math.round(meters);
    if (roundedMeters < 1000) {
      return `${roundedMeters}m`;
    } else {
      return `${(roundedMeters / 1000).toFixed(1)}km`;
    }
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
      x: mapX, // Keep decimal precision for accurate distance calculations
      y: mapY
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
        y: e.clientY - rect.top,
        absoluteX: e.clientX,
        absoluteY: e.clientY
      });
    }
    
    // Debug: log coordinate conversion for testing
    if (coords.x && coords.y) {
      const containerRect = mapContainerRef.current?.getBoundingClientRect();
      console.log('Mouse coords:', coords, 'Raw clientX/Y:', e.clientX, e.clientY, 'Container offset:', containerRect?.left, containerRect?.top);
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
      
      const mapCoords = pixelToMapCoords(e.clientX, e.clientY);
      
      // No longer need to store screen coordinates - we'll calculate them dynamically
      
      if (!currentMeasurement) {
        // Start new measurement - clear previous markers and measurements
        const newMarker = { 
          id: Date.now(), 
          mapCoords: mapCoords // Keep precise coordinates for calculations
        };
        setMarkers([newMarker]); // Replace all markers with just the new one
        setMeasurements([]); // Clear previous measurements
        setCurrentMeasurement({ start: { mapCoords }, startMarker: newMarker });
      } else {
        // Complete measurement
        const distance = calculateDistance(currentMeasurement.start.mapCoords, mapCoords);
        const newMeasurement = {
          id: Date.now(),
          start: currentMeasurement.start,
          end: { mapCoords },
          distance: distance
        };
        
        // Add second marker and complete the measurement
        const endMarker = {
          id: Date.now() + 1,
          mapCoords: mapCoords
        };
        
        // Use the original first marker without modification to prevent any coordinate changes
        setMarkers([currentMeasurement.startMarker, endMarker]);
        setMeasurements([newMeasurement]);
        setCurrentMeasurement(null);
        
        // Update URL with coordinates
        updateURLWithMeasurement(currentMeasurement.start.mapCoords, mapCoords);
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
    // Clear URL parameters
    setSearchParams({});
  };

  // Update URL with measurement coordinates
  const updateURLWithMeasurement = (startCoords, endCoords) => {
    const params = new URLSearchParams();
    params.set('from', `${Math.round(startCoords.x)}-${Math.round(startCoords.y)}`);
    params.set('to', `${Math.round(endCoords.x)}-${Math.round(endCoords.y)}`);
    setSearchParams(params);
  };

  // Check if coordinates are available to share
  const hasCoordinatesToShare = () => {
    return searchParams.get('from') && searchParams.get('to');
  };

  // Copy current URL to clipboard
  const handleShareSpot = async () => {
    if (!hasCoordinatesToShare()) return;
    
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      
      // Optional: Show a brief success message
      // You could add a toast notification here if desired
      console.log('URL copied to clipboard:', currentUrl);
    } catch (error) {
      console.error('Failed to copy URL to clipboard:', error);
      // Fallback: select the URL in an input field
      const tempInput = document.createElement('input');
      tempInput.value = window.location.href;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }
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

  // Load coordinates from URL parameters
  useEffect(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    if (fromParam && toParam && mapBounds) {
      try {
        const [fromX, fromY] = fromParam.split('-').map(Number);
        const [toX, toY] = toParam.split('-').map(Number);
        
        // Validate coordinates are within map bounds
        if (fromX >= mapBounds.minX && fromX <= mapBounds.maxX && 
            fromY >= mapBounds.minY && fromY <= mapBounds.maxY &&
            toX >= mapBounds.minX && toX <= mapBounds.maxX && 
            toY >= mapBounds.minY && toY <= mapBounds.maxY) {
          
          const startCoords = { x: fromX, y: fromY };
          const endCoords = { x: toX, y: toY };
          
          // Create markers and measurement
          const startMarker = { id: Date.now(), mapCoords: startCoords };
          const endMarker = { id: Date.now() + 1, mapCoords: endCoords };
          const distance = calculateDistance(startCoords, endCoords);
          const measurement = {
            id: Date.now() + 2,
            start: { mapCoords: startCoords },
            end: { mapCoords: endCoords },
            distance: distance
          };
          
          setMarkers([startMarker, endMarker]);
          setMeasurements([measurement]);
          setCurrentMeasurement(null);
        }
      } catch (error) {
        console.error('Invalid coordinate parameters:', error);
      }
    }
  }, [searchParams, mapBounds, calculateDistance]);

  // Handle URL map changes and redirect if no map specified
  useEffect(() => {
    // If we're on /maps without a specific map, redirect to default map
    if (location.pathname === '/maps' && !mapName) {
      navigate('/maps/copper', { replace: true });
      return;
    }
    
    const newMapFile = getCurrentMapFile();
    if (newMapFile !== currentMap) {
      setCurrentMap(newMapFile);
    }
  }, [mapName, navigate]);

  // Update map bounds when map changes
  useEffect(() => {
    const bounds = parseMapBounds(currentMap);
    setMapBounds(bounds);
    resetView(); // Reset view when switching maps
    // Only clear measurements if not loading from URL
    if (!searchParams.get('from') || !searchParams.get('to')) {
      clearMeasurements(); // Clear measurements when switching maps
    }
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
              value={mapName || Object.keys(availableMaps)[0]} 
              onChange={(e) => {
                const selectedMapName = e.target.value;
                if (selectedMapName !== mapName) {
                  navigate(`/maps/${selectedMapName}`);
                }
              }}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {Object.entries(availableMaps).map(([mapKey, mapFile]) => (
                <option key={mapKey} value={mapKey}>
                  {parseMapBounds(mapFile)?.name || mapKey}
                </option>
              ))}
            </select>
            
            {/* Share Spot Button */}
            <button
              onClick={handleShareSpot}
              disabled={!hasCoordinatesToShare()}
              className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                hasCoordinatesToShare()
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
              title={hasCoordinatesToShare() ? 'Copy shareable link to clipboard' : 'Make a measurement to share coordinates'}
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share Spot
            </button>
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
          className={`w-full h-full overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
          onMouseMove={handleMouseMove}
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
              onLoad={() => {
                // Auto-fit to screen when image loads
                setTimeout(fitToScreen, 100);
              }}
              onError={(e) => {
                console.error('Failed to load map image:', e);
              }}
              onDragStart={(e) => e.preventDefault()} // Prevent image drag
            />
            
            
          </div>
        </div>

        
        {/* Click markers - positioned relative to map container */}
        {markers.map((marker, index) => {
          const screenPos = mapCoordsToCurrentScreenPos(marker.mapCoords);
          
          // Debug logging for first marker
          if (index === 0) {
            console.log('First marker coords:', marker.mapCoords);
            console.log('First marker screen pos:', screenPos);
          }
          
          // Check if this is the first marker and if there's a measurement
          const isFirstMarker = index === 0;
          const hasActiveMeasurement = measurements.length > 0;
          let popupOffset = { x: 8, y: -20 };
          
          if (isFirstMarker && hasActiveMeasurement) {
            // Get distance box position to avoid overlap
            const measurement = measurements[0];
            const startPos = mapCoordsToCurrentScreenPos(measurement.start.mapCoords);
            const endPos = mapCoordsToCurrentScreenPos(measurement.end.mapCoords);
            const midX = (startPos.x + endPos.x) / 2;
            const midY = (startPos.y + endPos.y) / 2;
            
            // Calculate actual popup and distance box boundaries
            const popupX = screenPos.x + 8;
            const popupY = screenPos.y - 20;
            const popupWidth = 60; // Approximate width of coordinate text
            const popupHeight = 20;
            
            const distanceBoxX = midX - 40; // Distance box is centered, so subtract half width
            const distanceBoxY = midY - 20;
            const distanceBoxWidth = 80; // Approximate width of distance text
            const distanceBoxHeight = 20;
            
            // Check for actual rectangle overlap
            const horizontalOverlap = (popupX < distanceBoxX + distanceBoxWidth) && 
                                    (popupX + popupWidth > distanceBoxX);
            const verticalOverlap = (popupY < distanceBoxY + distanceBoxHeight) && 
                                  (popupY + popupHeight > distanceBoxY);
            
            if (horizontalOverlap && verticalOverlap) {
              // Try left side first
              popupOffset = { x: -70, y: -20 };
              
              // If left side would also overlap, try below
              const leftPopupX = screenPos.x - 70;
              const leftHorizontalOverlap = (leftPopupX < distanceBoxX + distanceBoxWidth) && 
                                          (leftPopupX + popupWidth > distanceBoxX);
              
              if (leftHorizontalOverlap && verticalOverlap) {
                popupOffset = { x: 8, y: 10 }; // Move below marker
              }
            }
          }
          
          return (
            <div key={marker.id}>
              {/* Only show dot for first marker */}
              {isFirstMarker && (
                <div
                  className="absolute w-3 h-3 bg-blue-800 rounded-full border border-black pointer-events-none z-20"
                  style={{
                    left: screenPos.x - 6,
                    top: screenPos.y - 6,
                  }}
                />
              )}
              {/* Marker coordinate popup - only show for first marker */}
              {isFirstMarker && (
                <div
                  className="absolute pointer-events-none z-20 bg-blue-800 text-white px-2 py-1 rounded text-xs font-mono font-bold border border-black"
                  style={{
                    left: screenPos.x + popupOffset.x,
                    top: screenPos.y + popupOffset.y,
                  }}
                >
                  {Math.round(marker.mapCoords.x)}:{Math.round(marker.mapCoords.y)}
                </div>
              )}
            </div>
          );
        })}

        {/* Measurement lines and labels */}
        {measurements.map(measurement => {
          const startPos = mapCoordsToCurrentScreenPos(measurement.start.mapCoords);
          const endPos = mapCoordsToCurrentScreenPos(measurement.end.mapCoords);
          
          // Debug logging for measurement line
          console.log('Measurement start coords:', measurement.start.mapCoords);
          console.log('Measurement start screen pos:', startPos);
          
          // Calculate line properties
          const deltaX = endPos.x - startPos.x;
          const deltaY = endPos.y - startPos.y;
          const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
          
          // Midpoint for label
          const midX = (startPos.x + endPos.x) / 2;
          const midY = (startPos.y + endPos.y) / 2;
          
          return (
            <div key={`measurement-${measurement.id}`}>
              {/* Line with black outline */}
              <div
                className="absolute bg-black pointer-events-none z-14"
                style={{
                  left: startPos.x,
                  top: startPos.y - 3,
                  width: length,
                  height: 6,
                  transformOrigin: 'left center',
                  transform: `rotate(${angle}deg)`,
                }}
              />
              <div
                className="absolute bg-blue-800 pointer-events-none z-15"
                style={{
                  left: startPos.x,
                  top: startPos.y - 2,
                  width: length,
                  height: 4,
                  transformOrigin: 'left center',
                  transform: `rotate(${angle}deg)`,
                }}
              />
              
              {/* Arrow at end point with black outline */}
              <div
                className="absolute pointer-events-none z-14"
                style={{
                  left: endPos.x,
                  top: endPos.y,
                  width: 0,
                  height: 0,
                  borderLeft: '14px solid black',
                  borderTop: '9px solid transparent',
                  borderBottom: '9px solid transparent',
                  transform: `rotate(${angle}deg) translate(-14px, -9px)`,
                  transformOrigin: '0 0',
                }}
              />
              <div
                className="absolute pointer-events-none z-15"
                style={{
                  left: endPos.x,
                  top: endPos.y,
                  width: 0,
                  height: 0,
                  borderLeft: '12px solid #1e40af',
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  transform: `rotate(${angle}deg) translate(-12px, -8px)`,
                  transformOrigin: '0 0',
                }}
              />
              
              {/* Distance label */}
              <div
                className="absolute pointer-events-none z-20 bg-blue-800 text-white px-2 py-1 rounded text-xs font-mono font-bold border border-black"
                style={{
                  left: midX,
                  top: midY - 20,
                  transform: 'translateX(-50%)',
                }}
              >
                {formatDistance(measurement.distance)}
              </div>
            </div>
          );
        })}

        {/* Current measurement line (while measuring) */}
        {currentMeasurement && isMouseOverMap && (
          (() => {
            const startPos = mapCoordsToCurrentScreenPos(currentMeasurement.start.mapCoords);
            const endPos = { x: mousePosition.x, y: mousePosition.y };
            
            const deltaX = endPos.x - startPos.x;
            const deltaY = endPos.y - startPos.y;
            const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
            
            return (
              <>
                <div
                  className="absolute bg-black pointer-events-none z-14 opacity-50"
                  style={{
                    left: startPos.x,
                    top: startPos.y - 3,
                    width: length,
                    height: 6,
                    transformOrigin: 'left center',
                    transform: `rotate(${angle}deg)`,
                  }}
                />
                <div
                  className="absolute bg-blue-700 pointer-events-none z-15 opacity-70"
                  style={{
                    left: startPos.x,
                    top: startPos.y - 2,
                    width: length,
                    height: 4,
                    transformOrigin: 'left center',
                    transform: `rotate(${angle}deg)`,
                  }}
                />
              </>
            );
          })()
        )}

        {/* Floating Coordinate Box */}
        {isMouseOverMap && (
          <div 
            className="absolute pointer-events-none z-20 bg-blue-800 text-white px-2 py-1 rounded text-sm font-mono font-bold border border-black"
            style={{
              left: mousePosition.x + 15, // Offset from cursor
              top: mousePosition.y - 30,
              transform: mousePosition.x > (mapContainerRef.current?.offsetWidth || 0) - 100 
                ? 'translateX(-100%)' 
                : 'none' // Flip to left side if near right edge
            }}
          >
            <div>{Math.round(mouseCoords.x)}:{Math.round(mouseCoords.y)}</div>
            {currentMeasurement && (
              <div className="text-blue-300">
                {formatDistance(calculateDistance(currentMeasurement.start.mapCoords, mouseCoords))}
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