
	class ReusableMap {
		constructor(containerId, options = {}) {
			this.containerId = containerId;
			this.markers = [];
			this.eventHandlers = {
				markerClick: [],
				mapClick: [],
				markerAdd: [],
				markerRemove: []
			};

			// Default options
			this.options = {
				center: [51.505, -0.09], // London by default
				zoom: 13,
				...options
			};

			this.init();
		}

		init() {
			// Initialize the map
			this.map = L.map(this.containerId).setView(this.options.center, this.options.zoom);

			// Add tile layer
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '© OpenStreetMap contributors'
			}).addTo(this.map);

			// Add map click handler
			this.map.on('click', (e) => {
				this.triggerEvent('mapClick', {
					lat: e.latlng.lat,
					lng: e.latlng.lng,
					originalEvent: e
				});
			});
		}

		// Add a marker to the map
		addMarker(markerData) {
			const { lat, lng, popup = '', icon = null, id = null } = markerData;

			// Create marker
			const marker = L.marker([lat, lng]);

			// Add custom icon if provided
			if (icon) {
				marker.setIcon(icon);
			}

			// Add popup if provided
			if (popup) {
				marker.bindPopup(popup);
			}

			// Add to map
			marker.addTo(this.map);

			// Store marker data
			const markerInfo = {
				id: id || Date.now() + Math.random(),
				marker: marker,
				data: markerData
			};

			this.markers.push(markerInfo);

			// Add click handler
			marker.on('click', (e) => {
				this.triggerEvent('markerClick', {
					id: markerInfo.id,
					lat: lat,
					lng: lng,
					data: markerData,
					originalEvent: e
				});
			});

			// Trigger marker add event
			this.triggerEvent('markerAdd', markerInfo);

			return markerInfo.id;
		}

		// Remove a marker by id
		removeMarker(id) {
			const index = this.markers.findIndex((m) => m.id === id);
			if (index !== -1) {
				const markerInfo = this.markers[index];
				this.map.removeLayer(markerInfo.marker);
				this.markers.splice(index, 1);
				this.triggerEvent('markerRemove', markerInfo);
				return true;
			}
			return false;
		}

		// Clear all markers
		clearMarkers() {
			this.markers.forEach((markerInfo) => {
				this.map.removeLayer(markerInfo.marker);
				this.triggerEvent('markerRemove', markerInfo);
			});
			this.markers = [];
		}

		// Get all markers
		getMarkers() {
			return this.markers.map((m) => ({
				id: m.id,
				lat: m.data.lat,
				lng: m.data.lng,
				data: m.data
			}));
		}

		// Set map center
		setCenter(lat, lng, zoom = null) {
			if (zoom !== null) {
				this.map.setView([lat, lng], zoom);
			} else {
				this.map.setView([lat, lng]);
			}
		}

		// Fit map to show all markers
		fitToMarkers() {
			if (this.markers.length > 0) {
				const group = new L.featureGroup(this.markers.map((m) => m.marker));
				this.map.fitBounds(group.getBounds().pad(0.1));
			}
		}

		// Event handling
		on(eventType, handler) {
			if (this.eventHandlers[eventType]) {
				this.eventHandlers[eventType].push(handler);
			}
		}

		off(eventType, handler) {
			if (this.eventHandlers[eventType]) {
				const index = this.eventHandlers[eventType].indexOf(handler);
				if (index > -1) {
					this.eventHandlers[eventType].splice(index, 1);
				}
			}
		}

		triggerEvent(eventType, data) {
			if (this.eventHandlers[eventType]) {
				this.eventHandlers[eventType].forEach((handler) => {
					try {
						handler(data);
					} catch (error) {
						console.error('Error in event handler:', error);
					}
				});
			}
		}
	}

	// Demo usage
	let mapInstance;
	let eventLogEl;

	// Initialize when page loads
	document.addEventListener('DOMContentLoaded', function () {
		eventLogEl = document.getElementById('eventLog');

		// Create map instance
		mapInstance = new ReusableMap('map', {
			center: [40.7128, -74.006], // NYC
			zoom: 12
		});

		// Add event handlers
		mapInstance.on('markerClick', function (data) {
			logEvent(
				'Marker Clicked',
				`ID: ${data.id}, Lat: ${data.lat.toFixed(4)}, Lng: ${data.lng.toFixed(4)}`
			);
		});

		mapInstance.on('mapClick', function (data) {
			logEvent('Map Clicked', `Lat: ${data.lat.toFixed(4)}, Lng: ${data.lng.toFixed(4)}`);
		});

		mapInstance.on('markerAdd', function (data) {
			logEvent('Marker Added', `ID: ${data.id}`);
		});

		mapInstance.on('markerRemove', function (data) {
			logEvent('Marker Removed', `ID: ${data.id}`);
		});

		// Add some initial markers
		mapInstance.addMarker({
			lat: 40.7128,
			lng: -74.006,
			popup: '<b>New York City</b><br>The Big Apple!',
			id: 'nyc'
		});

		mapInstance.addMarker({
			lat: 40.7589,
			lng: -73.9851,
			popup: '<b>Times Square</b><br>The Crossroads of the World',
			id: 'times-square'
		});
	});

	// Demo functions
	function addRandomMarker() {
		const lat = 40.7128 + (Math.random() - 0.5) * 0.1;
		const lng = -74.006 + (Math.random() - 0.5) * 0.1;

		mapInstance.addMarker({
			lat: lat,
			lng: lng,
			popup: `<b>Random Marker</b><br>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}`
		});
	}

	function addCustomMarker() {
		mapInstance.addMarker({
			lat: 40.6892,
			lng: -74.0445,
			popup: '<b>Statue of Liberty</b><br>Liberty Island',
			id: 'liberty'
		});
	}

	function clearMarkers() {
		mapInstance.clearMarkers();
	}

	function centerMap() {
		if (mapInstance.getMarkers().length > 0) {
			mapInstance.fitToMarkers();
		} else {
			mapInstance.setCenter(40.7128, -74.006, 12);
		}
	}

	function logEvent(type, details) {
		const timestamp = new Date().toLocaleTimeString();
		const eventEl = document.createElement('div');
		eventEl.className = 'event-item';
		eventEl.innerHTML = `<strong>${timestamp}</strong> - ${type}: ${details}`;
		eventLogEl.insertBefore(eventEl, eventLogEl.firstChild);

		// Keep only last 20 events
		while (eventLogEl.children.length > 20) {
			eventLogEl.removeChild(eventLogEl.lastChild);
		}
	}