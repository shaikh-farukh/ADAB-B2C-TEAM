import React, { useEffect, useState, useMemo } from 'react';
import { Compass, MapPin, Factory, Truck, Store, Info, Search, Filter } from 'lucide-react';
import mapService from '../../services/mapService';
import { useNotification } from '../../context/NotificationContext';

const MarketCoveragePage: React.FC = () => {
  const { showError } = useNotification();
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [pincodeFilter, setPincodeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoading(true);
      try {
        const response = await mapService.getMarketCoverage({
          business_type: filterType === 'all' ? undefined : filterType as 'manufacturer' | 'distributor' | 'shop',
          state_id: stateId.trim() || undefined,
          city_id: cityId.trim() || undefined,
          pincode: pincodeFilter.trim() || undefined,
          category: categoryFilter.trim() || undefined
        });
        setLocations(response.data || []);
      } catch (err: any) {
        showError(err.message || 'Failed to fetch market coverage locations');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLocations();
  }, [filterType, stateId, cityId, pincodeFilter, categoryFilter, showError]);

  // Filter locations
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      const matchesSearch =
        loc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.state?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.pincode?.includes(searchQuery);

      return matchesSearch;
    });
  }, [locations, searchQuery]);

  // Project lat/lng to SVG space (X: 50 to 750, Y: 50 to 450)
  const projectedPoints = useMemo(() => {
    if (filteredLocations.length === 0) return [];

    // Find bounding box
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

    // We should use all locations to keep coordinate scale stable, or just filtered ones
    const sourceList = locations.filter(l => l.latitude && l.longitude);
    if (sourceList.length === 0) return [];

    sourceList.forEach(loc => {
      if (loc.latitude < minLat) minLat = loc.latitude;
      if (loc.latitude > maxLat) maxLat = loc.latitude;
      if (loc.longitude < minLng) minLng = loc.longitude;
      if (loc.longitude > maxLng) maxLng = loc.longitude;
    });

    // Handle single point edge case
    const latSpan = maxLat - minLat === 0 ? 1 : maxLat - minLat;
    const lngSpan = maxLng - minLng === 0 ? 1 : maxLng - minLng;

    const padding = 60;
    const width = 800;
    const height = 500;

    return filteredLocations.map(loc => {
      // Invert Y coordinate because SVG origin is top-left
      const x = padding + ((loc.longitude - minLng) / lngSpan) * (width - 2 * padding);
      const y = height - padding - ((loc.latitude - minLat) / latSpan) * (height - 2 * padding);

      return {
        ...loc,
        x,
        y
      };
    });
  }, [filteredLocations, locations]);

  // Generate connection links: Manufacturers (orange) -> Distributors (blue) -> Shops (green)
  const connectionLinks = useMemo(() => {
    const links: any[] = [];
    const manufacturers = projectedPoints.filter(p => p.business_type === 'manufacturer');
    const distributors = projectedPoints.filter(p => p.business_type === 'distributor');
    const shops = projectedPoints.filter(p => p.business_type === 'shop');

    // Link Manufacturers to Distributors (in the same state or city)
    manufacturers.forEach(m => {
      distributors.forEach(d => {
        if (m.state === d.state || m.city === d.city) {
          links.push({
            id: `link-${m.id}-${d.id}`,
            x1: m.x,
            y1: m.y,
            x2: d.x,
            y2: d.y,
            type: 'manufacturer-distributor'
          });
        }
      });
    });

    // Link Distributors to Shops (in same state/city/pincode)
    distributors.forEach(d => {
      shops.forEach(s => {
        if (d.state === s.state || d.pincode === s.pincode) {
          links.push({
            id: `link-${d.id}-${s.id}`,
            x1: d.x,
            y1: d.y,
            x2: s.x,
            y2: s.y,
            type: 'distributor-shop'
          });
        }
      });
    });

    return links;
  }, [projectedPoints]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'manufacturer':
        return '#f97316'; // orange
      case 'distributor':
        return '#2563eb'; // blue
      case 'shop':
        return '#16a34a'; // green
      default:
        return '#64748b'; // gray
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'manufacturer':
        return <Factory className="w-4 h-4 text-white" />;
      case 'distributor':
        return <Truck className="w-4 h-4 text-white" />;
      case 'shop':
        return <Store className="w-4 h-4 text-white" />;
      default:
        return <MapPin className="w-4 h-4 text-white" />;
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-24">
      {/* Header */}
      <div className="border-b border-gray-100 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Compass className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Geo distribution</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight">Market Coverage Map</h1>
          <p className="text-sm text-gray-500 font-medium">Interactive visual mapping of manufacturer hubs, distributor centers, and retail shops.</p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search city, state, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-xl text-xs font-bold outline-none focus:border-blue-600 w-60"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Entity Types</option>
              <option value="manufacturer">Manufacturers Only</option>
              <option value="distributor">Distributors Only</option>
              <option value="shop">Retail Shops Only</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="State ID"
            value={stateId}
            onChange={(e) => setStateId(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-xl text-xs font-bold outline-none focus:border-blue-600 w-24"
          />
          <input
            type="text"
            placeholder="City ID"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-xl text-xs font-bold outline-none focus:border-blue-600 w-24"
          />
          <input
            type="text"
            placeholder="Pincode"
            value={pincodeFilter}
            onChange={(e) => setPincodeFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-xl text-xs font-bold outline-none focus:border-blue-600 w-28"
          />
          <input
            type="text"
            placeholder="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-xl text-xs font-bold outline-none focus:border-blue-600 w-32"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Map Visualization SVG */}
        <div className="lg:col-span-2 bg-slate-950 rounded-[2rem] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[550px] border border-slate-900">
          <div className="absolute top-4 left-4 bg-slate-900/80 border border-slate-800 backdrop-blur px-3 py-1.5 rounded-full text-[10px] text-slate-300 font-bold uppercase tracking-widest">
            Interactive Node Canvas
          </div>

          {/* Interactive Legend */}
          <div className="absolute top-4 right-4 flex items-center gap-3 bg-slate-900/80 border border-slate-800 backdrop-blur px-3 py-1.5 rounded-full text-[9px] text-slate-300 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Mfg</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Dist</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Shop</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="w-10 h-10 border-4 border-white/20 border-tbg-white dark:bg-dark-app-secondary rounded-2xll animate-spin"></div>
            </div>
          ) : projectedPoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-500 space-y-2">
              <Compass className="w-12 h-12 text-slate-700 animate-spin-slow" />
              <p className="text-sm font-semibold">No geo nodes found matching the filter.</p>
            </div>
          ) : (
            <svg viewBox="0 0 800 500" className="w-full h-full flex-1 mt-6">
              {/* Grid pattern background */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Draw animated supply routes */}
              {connectionLinks.map((link) => (
                <line
                  key={link.id}
                  x1={link.x1}
                  y1={link.y1}
                  x2={link.x2}
                  y2={link.y2}
                  stroke={link.type === 'manufacturer-distributor' ? 'rgba(249,115,22,0.18)' : 'rgba(37,99,235,0.18)'}
                  strokeWidth="2"
                  strokeDasharray="6,4"
                  className="animate-[dash_10s_linear_infinite]"
                />
              ))}

              {/* Draw Nodes */}
              {projectedPoints.map((node) => {
                const color = getNodeColor(node.business_type);
                const isSelected = selectedNode?.id === node.id && selectedNode?.business_type === node.business_type;
                return (
                  <g
                    key={`${node.business_type}-${node.id}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedNode(node)}
                  >
                    {/* Ring highlight when selected */}
                    {isSelected && (
                      <circle r="20" fill="none" stroke={color} strokeWidth="2" className="animate-ping opacity-75" />
                    )}

                    <circle
                      r={node.business_type === 'manufacturer' ? 14 : 11}
                      fill={color}
                      className="transition-transform duration-200 group-hover:scale-125"
                      style={{ filter: `drop-shadow(0px 0px 8px ${color}55)` }}
                    />

                    {/* Tiny visual text label */}
                    <text
                      y={node.business_type === 'manufacturer' ? -22 : -18}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="700"
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 duration-200 pointer-events-none"
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Quick instructions bar */}
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mt-4">
            💡 Click on any node marker to view supplier coordinates, active state, and pincode location.
          </div>
        </div>

        {/* Right Column: Node Details Panel */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-100 dark:borderbg-white dark:bg-dark-app-secondary rounded-[2rem] p-6 shadow-sm min-h-[550px] flex flex-col justify-between">
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-dark-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Entity Inspector
              </h3>

              {selectedNode ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Visual Category Label */}
                  <div className="flex items-center gap-2">
                    <span
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: getNodeColor(selectedNode.business_type) }}
                    >
                      {getNodeIcon(selectedNode.business_type)}
                    </span>
                    <div>
                      <h4 className="text-lg font-black text-gray-900 dark:text-dark-text-secondary leading-tight">{selectedNode.name}</h4>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 capitalize">
                        {selectedNode.business_type}
                      </span>
                    </div>
                  </div>

                  {/* Node Address Details */}
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-4">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Location</span>
                      <p className="text-xs text-gray-800 font-bold leading-relaxed">{selectedNode.address}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">City</span>
                        <p className="text-xs text-gray-800 font-bold">{selectedNode.city || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">State</span>
                        <p className="text-xs text-gray-800 font-bold">{selectedNode.state || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Pincode</span>
                        <p className="text-xs text-gray-800 font-bold">{selectedNode.pincode || 'N/A'}</p>
                      </div>
                      {selectedNode.contact_no && (
                        <div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Contact</span>
                          <p className="text-xs text-gray-800 font-bold">{selectedNode.contact_no}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Coordinates</span>
                      <p className="text-xs font-mono text-gray-600">
                        Lat: {selectedNode.latitude.toFixed(6)}, Lng: {selectedNode.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-gray-400 space-y-3">
                  <Compass className="w-12 h-12 text-gray-300 mx-auto animate-bounce" />
                  <p className="text-xs font-semibold max-w-[200px] mx-auto leading-relaxed">
                    Select a node on the canvas to inspect its geographical info and supply connections.
                  </p>
                </div>
              )}
            </div>

            {/* Entity Stats Panel */}
            <div className="border-t border-gray-100 pt-6 space-y-4">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Distribution Summary</span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-2.5">
                  <span className="text-lg font-black text-orange-700">
                    {locations.filter(l => l.business_type === 'manufacturer').length}
                  </span>
                  <span className="text-[9px] font-bold text-orange-600 block uppercase">Mfg</span>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5">
                  <span className="text-lg font-black text-blue-700">
                    {locations.filter(l => l.business_type === 'distributor').length}
                  </span>
                  <span className="text-[9px] font-bold text-blue-600 block uppercase">Dist</span>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-2.5">
                  <span className="text-lg font-black text-green-700">
                    {locations.filter(l => l.business_type === 'shop').length}
                  </span>
                  <span className="text-[9px] font-bold text-green-600 block uppercase">Shops</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketCoveragePage;
