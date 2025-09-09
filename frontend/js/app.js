/**
 * SmartWaste AI Frontend - Firebase Integrated
 * ML-powered bin-to-bin navigation with Firebase backend
 */

class SmartWasteAI {
    constructor() {
        this.apiBase = 'http://localhost:5000';
        this.bins = [];
        this.currentRoute = [];
        this.selectedBin = null;
        this.map = null;
        this.markers = [];
        this.routePolyline = null;
        this.currentLocationMarker = null;

        // Navigation state
        this.isNavigating = false;
        this.currentDestination = null;
        this.navigationInterval = null;

        // Current position (simulated)
        this.currentPosition = { lat: 40.7128, lng: -74.0060 };

        this.init();
    }

    async init() {
        console.log('🚀 Initializing SmartWaste AI with Firebase Backend...');

        try {
            // Test backend connection first
            await this.testBackendConnection();

            // Initialize map
            this.initMap();

            // Load initial data
            await this.loadBinData();

            // Setup event listeners
            this.setupEventListeners();

            // Start real-time updates
            this.startRealTimeUpdates();

            console.log('✅ SmartWaste AI initialized successfully');
            this.showToast('SmartWaste AI system online with Firebase', 'success');

        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showToast('Failed to initialize system', 'error');
            this.updateConnectionStatus('error');
        }
    }

    async testBackendConnection() {
        try {
            const response = await fetch(`${this.apiBase}/api/health`);
            const data = await response.json();

            if (data.status === 'healthy') {
                console.log('✅ Backend connection established');
                console.log('📊 Backend info:', data);
                this.updateConnectionStatus('connected');

                // Update connection status text
                const statusElement = document.querySelector('.connection-status span');
                if (statusElement) {
                    if (data.database === 'firestore') {
                        statusElement.textContent = 'Firebase Connected';
                    } else {
                        statusElement.textContent = 'Local Mode';
                    }
                }
            } else {
                throw new Error('Backend unhealthy');
            }
        } catch (error) {
            console.error('❌ Backend connection failed:', error);
            this.updateConnectionStatus('error');
            throw error;
        }
    }

    updateConnectionStatus(status) {
        const statusDot = document.querySelector('.status-dot');
        if (statusDot) {
            statusDot.className = 'status-dot';
            statusDot.classList.add(`status-${status}`);
        }
    }

    initMap() {
        // Initialize Leaflet map
        this.map = L.map('route-map').setView([this.currentPosition.lat, this.currentPosition.lng], 13);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add current location marker
        this.currentLocationMarker = L.marker([this.currentPosition.lat, this.currentPosition.lng], {
            icon: L.divIcon({
                className: 'current-location-marker',
                html: '<i class="fas fa-location-dot" style="color: #00f5ff; font-size: 20px;"></i>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(this.map);

        console.log('🗺️ Map initialized');
    }

    async loadBinData() {
        try {
            this.showLoading('Loading bin data from Firebase...');

            const response = await fetch(`${this.apiBase}/api/bins`);
            const data = await response.json();

            this.bins = data.bins || [];

            if (data.system_stats) {
                this.updateSystemStats(data.system_stats);
            }

            this.renderBinList();
            this.updateMapMarkers();

            console.log(`📊 Loaded ${this.bins.length} bins from Firebase`);

        } catch (error) {
            console.error('Failed to load bin data:', error);
            this.showToast('Failed to load bin data from Firebase', 'error');
            this.updateConnectionStatus('error');
        } finally {
            this.hideLoading();
        }
    }

    updateSystemStats(stats) {
        // Update KPI cards
        const updates = {
            'total-bins': stats.total_bins || 0,
            'high-priority-count': stats.high_priority_count || 0,
            'critical-count': stats.critical_count || 0,
            'avg-fill': `${stats.average_fill || 0}%`
        };

        Object.entries(updates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    renderBinList() {
        const binList = document.getElementById('bin-list');
        binList.innerHTML = '';

        // Sort bins by priority score (highest first)
        const sortedBins = [...this.bins].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

        sortedBins.forEach(bin => {
            const binElement = this.createBinElement(bin);
            binList.appendChild(binElement);
        });
    }

    createBinElement(bin) {
        const element = document.createElement('div');
        element.className = `bin-item ${bin.waste_type || 'general'}`;
        element.dataset.binId = bin.id;

        if (this.selectedBin && this.selectedBin.id === bin.id) {
            element.classList.add('selected');
        }

        // Map waste types properly
        const wasteTypeMap = {
            'General Waste': 'general',
            'Recycling': 'recyclable', 
            'Organic Waste': 'biodegradable',
            'Hazardous': 'hazardous'
        };

        const wasteType = wasteTypeMap[bin.type] || bin.waste_type || 'general';
        element.className = `bin-item ${wasteType}`;

        element.innerHTML = `
            <div class="bin-header">
                <div class="bin-id">${bin.id}</div>
                <div class="bin-status ${bin.status}">${bin.status}</div>
            </div>

            <div class="bin-info">
                <div class="info-item">
                    <span class="info-label">Type</span>
                    <span class="info-value">${this.formatWasteType(bin.type || bin.waste_type)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Priority</span>
                    <span class="info-value">${((bin.priority_score || 0) * 100).toFixed(0)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Location</span>
                    <span class="info-value">${bin.location}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Full In</span>
                    <span class="info-value">${bin.predicted_full_time || 'N/A'}</span>
                </div>
            </div>

            <div class="bin-fill-bar">
                <div class="bin-fill-progress" style="width: ${bin.fillLevel || 0}%"></div>
                <div class="bin-fill-text">${bin.fillLevel || 0}%</div>
            </div>
        `;

        element.addEventListener('click', () => this.selectBin(bin));

        return element;
    }

    selectBin(bin) {
        this.selectedBin = bin;
        this.renderBinList(); // Re-render to show selection
        this.showBinDetails(bin);

        // Center map on selected bin
        if (bin.coordinates) {
            this.map.setView([bin.coordinates.lat, bin.coordinates.lng], 15);
        }

        console.log(`📍 Selected bin: ${bin.id}`);
    }

    showBinDetails(bin) {
        const detailsPanel = document.getElementById('bin-details');
        detailsPanel.style.display = 'block';

        document.getElementById('selected-bin-id').textContent = bin.id;
        document.getElementById('selected-bin-status').textContent = bin.status;
        document.getElementById('selected-bin-status').className = `bin-status ${bin.status}`;
        document.getElementById('selected-bin-location').textContent = bin.location;
        document.getElementById('selected-bin-type').textContent = this.formatWasteType(bin.type || bin.waste_type);
        document.getElementById('selected-bin-fill').style.width = `${bin.fillLevel || 0}%`;
        document.getElementById('selected-bin-fill-text').textContent = `${bin.fillLevel || 0}%`;
        document.getElementById('selected-bin-priority').textContent = ((bin.priority_score || 0) * 100).toFixed(1);
        document.getElementById('selected-bin-prediction').textContent = bin.predicted_full_time || 'N/A';

        // Update sensor data
        const sensorData = bin.sensor_data || {};
        document.getElementById('sensor-gas').textContent = `${sensorData.gas_reading || 0} ppm`;
        document.getElementById('sensor-temp').textContent = `${bin.temperature || 0}°C`;
        document.getElementById('sensor-weight').textContent = `${sensorData.weight || bin.weight || 0} kg`;
        document.getElementById('sensor-battery').textContent = `${bin.batteryLevel || 0}%`;
    }

    updateMapMarkers() {
        // Clear existing markers (except current location)
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        // Add bin markers
        this.bins.forEach(bin => {
            if (!bin.coordinates) return;

            const markerIcon = this.createBinMarkerIcon(bin);
            const marker = L.marker([bin.coordinates.lat, bin.coordinates.lng], { icon: markerIcon })
                .addTo(this.map);

            // Create popup with bin info
            const popupContent = `
                <div class="bin-popup">
                    <h3>${bin.id}</h3>
                    <p><strong>Type:</strong> ${this.formatWasteType(bin.type || bin.waste_type)}</p>
                    <p><strong>Fill Level:</strong> ${bin.fillLevel || 0}%</p>
                    <p><strong>Priority:</strong> ${((bin.priority_score || 0) * 100).toFixed(0)}</p>
                    <p><strong>Status:</strong> ${bin.status}</p>
                    <button onclick="window.smartWaste.selectBin(${JSON.stringify(bin).replace(/"/g, '&quot;')})">
                        Select Bin
                    </button>
                </div>
            `;

            marker.bindPopup(popupContent);
            this.markers.push(marker);
        });

        console.log(`🗺️ Updated ${this.markers.length} map markers`);
    }

    createBinMarkerIcon(bin) {
        const colors = {
            'general': '#6c757d',
            'recyclable': '#17a2b8',
            'biodegradable': '#28a745',
            'hazardous': '#dc3545'
        };

        // Map bin types to colors
        const wasteTypeMap = {
            'General Waste': 'general',
            'Recycling': 'recyclable',
            'Organic Waste': 'biodegradable', 
            'Hazardous': 'hazardous'
        };

        const wasteType = wasteTypeMap[bin.type] || bin.waste_type || 'general';
        const color = colors[wasteType] || colors.general;
        const size = (bin.priority_score || 0) > 0.7 ? 25 : 20;

        return L.divIcon({
            className: 'bin-marker',
            html: `
                <div style="
                    background: ${color};
                    border: 2px solid white;
                    border-radius: 50%;
                    width: ${size}px;
                    height: ${size}px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    ${(bin.priority_score || 0) > 0.8 ? 'animation: pulse 2s infinite;' : ''}
                ">
                    ${bin.fillLevel || 0}%
                </div>
            `,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });
    }

    async optimizeRoute() {
        try {
            this.showLoading('Optimizing route with Firebase ML...');

            const response = await fetch(`${this.apiBase}/api/route/optimize`);
            const data = await response.json();

            this.currentRoute = data.route || [];

            if (data.summary) {
                this.updateRouteSummary(data.summary);
            }

            this.drawRoute();

            this.showToast(`Route optimized: ${this.currentRoute.length} stops`, 'success');

            console.log(`🎯 Route optimized with ${this.currentRoute.length} stops`);

        } catch (error) {
            console.error('Failed to optimize route:', error);
            this.showToast('Failed to optimize route', 'error');
        } finally {
            this.hideLoading();
        }
    }

    updateRouteSummary(summary) {
        document.getElementById('total-stops').textContent = summary.total_stops || 0;
        document.getElementById('total-distance').textContent = `${summary.total_distance_km || 0} km`;
        document.getElementById('total-time').textContent = `${summary.estimated_time_minutes || 0} min`;
        document.getElementById('fuel-saved').textContent = `${summary.fuel_savings_percent || 0}%`;
    }

    drawRoute() {
        // Remove existing route
        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
        }

        if (this.currentRoute.length < 2) return;

        // Create route coordinates
        const routeCoords = [
            [this.currentPosition.lat, this.currentPosition.lng], // Start from current position
            ...this.currentRoute.map(stop => [stop.coordinates.lat, stop.coordinates.lng])
        ];

        // Draw route polyline
        this.routePolyline = L.polyline(routeCoords, {
            color: '#00f5ff',
            weight: 3,
            opacity: 0.8
        }).addTo(this.map);

        // Add route markers with numbers
        this.currentRoute.forEach((stop, index) => {
            const routeMarker = L.marker([stop.coordinates.lat, stop.coordinates.lng], {
                icon: L.divIcon({
                    className: 'route-marker',
                    html: `
                        <div style="
                            background: #00f5ff;
                            border: 2px solid white;
                            border-radius: 50%;
                            width: 30px;
                            height: 30px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 12px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        ">
                            ${index + 1}
                        </div>
                    `,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                })
            }).addTo(this.map);

            this.markers.push(routeMarker);
        });

        // Fit map to show the route
        this.map.fitBounds(this.routePolyline.getBounds(), { padding: [20, 20] });
    }

    async navigateToBin(binId) {
        try {
            this.showLoading('Getting navigation data from Firebase...');

            const response = await fetch(`${this.apiBase}/api/navigate/${binId}`);
            const data = await response.json();

            this.startNavigation(data);

        } catch (error) {
            console.error('Failed to get navigation:', error);
            this.showToast('Failed to start navigation', 'error');
        } finally {
            this.hideLoading();
        }
    }

    startNavigation(navData) {
        this.isNavigating = true;
        this.currentDestination = navData.target_bin;

        // Show navigation panel
        const navPanel = document.getElementById('current-navigation');
        navPanel.style.display = 'block';

        // Update navigation display
        document.getElementById('destination-name').textContent = navData.target_bin.id;
        document.getElementById('destination-location').textContent = navData.target_bin.location;
        document.getElementById('nav-distance').textContent = `${navData.navigation.distance_km} km`;
        document.getElementById('nav-time').textContent = `${navData.navigation.estimated_travel_time_minutes} min`;
        document.getElementById('predicted-fill').textContent = `${navData.navigation.predicted_fill_on_arrival}%`;

        // Draw direct route to destination
        this.drawDirectRoute(navData.target_bin);

        this.showToast(`Navigation started to ${navData.target_bin.id}`, 'info');

        // Simulate navigation progress
        this.simulateNavigation(navData);

        console.log(`🧭 Navigation started to ${navData.target_bin.id}`);
    }

    drawDirectRoute(targetBin) {
        // Remove existing route
        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
        }

        // Draw direct line to target
        const routeCoords = [
            [this.currentPosition.lat, this.currentPosition.lng],
            [targetBin.coordinates.lat, targetBin.coordinates.lng]
        ];

        this.routePolyline = L.polyline(routeCoords, {
            color: '#ff6b35',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 10'
        }).addTo(this.map);

        // Fit map to show route
        this.map.fitBounds(this.routePolyline.getBounds(), { padding: [50, 50] });
    }

    simulateNavigation(navData) {
        const totalTime = navData.navigation.estimated_travel_time_minutes * 60; // Convert to seconds
        let elapsed = 0;

        this.navigationInterval = setInterval(() => {
            elapsed += 1;
            const progress = elapsed / totalTime;

            if (progress >= 1) {
                this.completeNavigation();
                return;
            }

            // Update current position (simulate movement)
            const startLat = this.currentPosition.lat;
            const startLng = this.currentPosition.lng;
            const endLat = navData.target_bin.coordinates.lat;
            const endLng = navData.target_bin.coordinates.lng;

            this.currentPosition.lat = startLat + (endLat - startLat) * progress;
            this.currentPosition.lng = startLng + (endLng - startLng) * progress;

            // Update current location marker
            this.currentLocationMarker.setLatLng([this.currentPosition.lat, this.currentPosition.lng]);

            // Update remaining time
            const remainingMinutes = Math.ceil((totalTime - elapsed) / 60);
            document.getElementById('nav-time').textContent = `${remainingMinutes} min`;

        }, 1000);
    }

    completeNavigation() {
        clearInterval(this.navigationInterval);
        this.isNavigating = false;

        // Hide navigation panel
        document.getElementById('current-navigation').style.display = 'none';

        // Remove route
        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
        }

        this.showToast(`Arrived at ${this.currentDestination.id}`, 'success');

        // Simulate bin collection (update fill level)
        if (this.selectedBin) {
            this.selectedBin.fillLevel = 0;
            this.selectedBin.status = 'normal';
            this.renderBinList();
            this.updateMapMarkers();
            this.showBinDetails(this.selectedBin);
        }

        console.log(`✅ Navigation completed to ${this.currentDestination.id}`);
        this.currentDestination = null;
    }

    stopNavigation() {
        if (this.navigationInterval) {
            clearInterval(this.navigationInterval);
        }

        this.isNavigating = false;
        document.getElementById('current-navigation').style.display = 'none';

        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
        }

        this.showToast('Navigation stopped', 'warning');
        console.log('🛑 Navigation stopped');
    }

    async getBinPrediction(binId) {
        try {
            this.showLoading('Getting ML prediction from Firebase...');

            const response = await fetch(`${this.apiBase}/api/predict/${binId}`);
            const data = await response.json();

            this.showPredictionResults(data);

        } catch (error) {
            console.error('Failed to get prediction:', error);
            this.showToast('Failed to get prediction', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showPredictionResults(predictionData) {
        const resultsPanel = document.getElementById('prediction-results');
        resultsPanel.style.display = 'block';

        const predictions = predictionData.predictions;
        document.getElementById('pred-80').textContent = `${predictions.hours_to_80_percent}h`;
        document.getElementById('pred-90').textContent = `${predictions.hours_to_90_percent}h`;
        document.getElementById('pred-100').textContent = `${predictions.hours_to_full}h`;

        // Risk assessment
        const risk = predictionData.risk_assessment;
        const riskFill = document.getElementById('risk-fill');
        const riskText = document.getElementById('risk-text');

        riskFill.style.width = `${risk.overall_risk_score * 100}%`;
        riskText.textContent = risk.risk_level;
        riskText.className = `risk-text ${risk.risk_level}`;

        // Recommendations
        const recommendationsEl = document.getElementById('recommendations');
        recommendationsEl.innerHTML = '';

        risk.recommendations.forEach(rec => {
            const recEl = document.createElement('div');
            recEl.className = 'recommendation';
            recEl.textContent = rec;
            recommendationsEl.appendChild(recEl);
        });

        console.log(`🔮 Prediction results shown for ${predictionData.bin_id}`);
    }

    setupEventListeners() {
        // Optimize route button
        document.getElementById('optimize-route-btn')?.addEventListener('click', () => {
            this.optimizeRoute();
        });

        // Clear route button
        document.getElementById('clear-route-btn')?.addEventListener('click', () => {
            this.clearRoute();
        });

        // Navigate to bin button
        document.getElementById('navigate-to-bin')?.addEventListener('click', () => {
            if (this.selectedBin) {
                this.navigateToBin(this.selectedBin.id);
            }
        });

        // Predict bin button
        document.getElementById('predict-bin')?.addEventListener('click', () => {
            if (this.selectedBin) {
                this.getBinPrediction(this.selectedBin.id);
            }
        });

        // Stop navigation button
        document.getElementById('stop-navigation')?.addEventListener('click', () => {
            this.stopNavigation();
        });

        // Refresh button
        document.getElementById('refresh-btn')?.addEventListener('click', () => {
            this.loadBinData();
        });

        // Center map button
        document.getElementById('center-map')?.addEventListener('click', () => {
            this.map.setView([this.currentPosition.lat, this.currentPosition.lng], 13);
        });

        console.log('🎛️ Event listeners setup complete');
    }

    clearRoute() {
        this.currentRoute = [];

        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
        }

        // Clear route summary
        document.getElementById('total-stops').textContent = '0';
        document.getElementById('total-distance').textContent = '0 km';
        document.getElementById('total-time').textContent = '0 min';
        document.getElementById('fuel-saved').textContent = '0%';

        // Update markers (remove route markers)
        this.updateMapMarkers();

        this.showToast('Route cleared', 'info');
        console.log('🧹 Route cleared');
    }

    startRealTimeUpdates() {
        // Update bin data every 30 seconds
        setInterval(async () => {
            if (!this.isNavigating) {
                await this.loadBinData();
            }
        }, 30000);

        console.log('🔄 Real-time updates started (30s interval)');
    }

    formatWasteType(type) {
        const typeNames = {
            'general': 'General',
            'recyclable': 'Recyclable',
            'biodegradable': 'Bio-degradable',
            'hazardous': 'Hazardous',
            'General Waste': 'General',
            'Recycling': 'Recyclable',
            'Organic Waste': 'Bio-degradable',
            'Hazardous': 'Hazardous'
        };
        return typeNames[type] || type;
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const text = overlay.querySelector('.loading-text');
        text.textContent = message;
        overlay.classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-circle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <i class="toast-icon ${icons[type]}"></i>
                <span class="toast-message">${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        `;

        // Add close functionality
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Initializing SmartWaste AI with Firebase Backend...');
    window.smartWaste = new SmartWasteAI();
});

// Add CSS for pulse animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
    }
`;
document.head.appendChild(style);