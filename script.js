/* =========================================================
   NEXORA — REAL LOCATION + REAL NEARBY SEARCH
   ========================================================= */

"use strict";


/* =========================
   CONFIGURATION
========================= */

const CONFIG = {

  // Multiple servers = automatic fallback
  OVERPASS_SERVERS: [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
  ],

  REQUEST_TIMEOUT: 18000,

  DEFAULT_CENTER: [26.8467, 80.9462],

  MAX_RESULTS: 100

};


/* =========================
   STATE
========================= */

const state = {

  map: null,

  userLocation: null,

  userMarker: null,

  accuracyCircle: null,

  resultMarkers: [],

  results: [],

  searching: false,

  currentPage: "home"

};


/* =========================
   ELEMENTS
========================= */

const $ = id => document.getElementById(id);


/* =========================
   START
========================= */

document.addEventListener("DOMContentLoaded", () => {

  initMap();

  initNavigation();

  initSearch();

  initLocationButtons();

  initHelpers();

  renderHelpers();

});


/* =========================
   MAP
========================= */

function initMap() {

  if (!window.L) {

    console.error("Leaflet did not load.");

    return;

  }

  state.map = L.map("map", {

    zoomControl: false,

    attributionControl: true

  }).setView(CONFIG.DEFAULT_CENTER, 13);


  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }
  ).addTo(state.map);


  setTimeout(() => {

    state.map.invalidateSize();

  }, 300);

}


/* =========================
   NAVIGATION
========================= */

function initNavigation() {

  document.querySelectorAll("[data-page]").forEach(button => {

    button.addEventListener("click", () => {

      openPage(button.dataset.page);

    });

  });


  $("heroDiscover").addEventListener("click", () => {

    openPage("discover");

    setTimeout(() => {

      $("searchInput").focus();

    }, 200);

  });

}


function openPage(page) {

  state.currentPage = page;

  document.querySelectorAll(".page").forEach(section => {

    section.classList.remove("active");

  });


  const target = $("page-" + page);

  if (target) {

    target.classList.add("active");

  }


  document.querySelectorAll(".nav").forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.page === page
    );

  });


  document.querySelectorAll(".mobile-nav-btn").forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.page === page
    );

  });


  const titles = {

    home: "Home",

    discover: "Discover",

    helpers: "My Helpers"

  };


  $("pageTitle").textContent =
    titles[page] || "NEXORA";


  if (page === "discover" && state.map) {

    setTimeout(() => {

      state.map.invalidateSize();

    }, 150);

  }

}


/* =========================
   LOCATION
========================= */

function initLocationButtons() {

  $("locateBtn").addEventListener(
    "click",
    getUserLocation
  );


  $("heroLocate").addEventListener(
    "click",
    getUserLocation
  );


  $("topLocate").addEventListener(
    "click",
    getUserLocation
  );


  $("mapLocate").addEventListener(
    "click",
    () => {

      if (state.userLocation) {

        centerOnUser();

      } else {

        getUserLocation();

      }

    }
  );


  $("mapZoomIn").addEventListener(
    "click",
    () => state.map.zoomIn()
  );


  $("mapZoomOut").addEventListener(
    "click",
    () => state.map.zoomOut()
  );

}


function getUserLocation() {

  if (!navigator.geolocation) {

    showError(
      "This browser does not support GPS location."
    );

    return;

  }


  if (location.protocol !== "https:" &&
      location.hostname !== "localhost") {

    showError(
      "GPS requires HTTPS. Deploy this site on GitHub Pages."
    );

    return;

  }


  showLoading(
    "Finding your location",
    "Waiting for GPS permission..."
  );


  setStatus(
    "Requesting your exact location...",
    "ready"
  );


  navigator.geolocation.getCurrentPosition(

    position => {

      const lat = position.coords.latitude;

      const lon = position.coords.longitude;

      const accuracy =
        Number.isFinite(position.coords.accuracy)
          ? position.coords.accuracy
          : 50;


      state.userLocation = {

        lat,
        lon,
        accuracy

      };


      drawUserLocation();


      hideLoading();


      updateLocationUI();


      setStatus(
        "Location detected. Ready to search.",
        "ready"
      );

    },


    error => {

      hideLoading();

      handleLocationError(error);

    },


    {

      enableHighAccuracy: true,

      timeout: 15000,

      maximumAge: 0

    }

  );

}


/* =========================
   DRAW USER LOCATION
========================= */

function drawUserLocation() {

  if (!state.map || !state.userLocation) return;


  const {
    lat,
    lon,
    accuracy
  } = state.userLocation;


  if (state.userMarker) {

    state.map.removeLayer(
      state.userMarker
    );

  }


  if (state.accuracyCircle) {

    state.map.removeLayer(
      state.accuracyCircle
    );

  }


  const userIcon = L.divIcon({

    className: "",

    html: '<div class="user-location-marker"></div>',

    iconSize: [20,20],

    iconAnchor: [10,10]

  });


  state.userMarker = L.marker(
    [lat, lon],
    {
      icon: userIcon,
      zIndexOffset: 1000
    }
  )
  .addTo(state.map)
  .bindPopup(
    "<div class='popup-title'>Your location</div>" +
    "<div class='popup-info'>" +
    "GPS accuracy: about " +
    Math.round(accuracy) +
    " m</div>"
  );


  state.accuracyCircle = L.circle(
    [lat, lon],
    {
      radius: Math.min(accuracy, 500),
      color: "#54f39a",
      fillColor: "#54f39a",
      fillOpacity: 0.06,
      weight: 1
    }
  ).addTo(state.map);


  state.map.setView(
    [lat, lon],
    15,
    {
      animate: true
    }
  );

}


/* =========================
   CENTER USER
========================= */

function centerOnUser() {

  if (!state.userLocation) {

    getUserLocation();

    return;

  }


  state.map.flyTo(

    [
      state.userLocation.lat,
      state.userLocation.lon
    ],

    15,

    {
      duration: .8
    }

  );

}


/* =========================
   LOCATION UI
========================= */

function updateLocationUI() {

  if (!state.userLocation) return;


  const lat =
    state.userLocation.lat.toFixed(5);

  const lon =
    state.userLocation.lon.toFixed(5);


  $("topLocationText").textContent =
    "Location ready";


  $("locationMini").textContent =
    `${lat}, ${lon}`;


  $("mapLocationLabel").textContent =
    `GPS: ${lat}, ${lon}`;

}


function handleLocationError(error) {

  let message =
    "Unable to get your location.";


  if (error.code === 1) {

    message =
      "Location permission was denied. Allow location access for NEXORA.";

  }


  if (error.code === 2) {

    message =
      "GPS location is unavailable. Check your phone's Location setting.";

  }


  if (error.code === 3) {

    message =
      "GPS took too long. Turn on Location and try again.";

  }


  showError(message);

}


/* =========================
   SEARCH
========================= */

function initSearch() {

  $("searchBtn").addEventListener(
    "click",
    searchNearby
  );


  $("searchInput").addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {

        searchNearby();

      }

    }
  );


  $("clearSearch").addEventListener(
    "click",
    () => {

      $("searchInput").value = "";

      clearResults();

      setStatus(
        "Ready to search",
        "ready"
      );

    }
  );


  document.querySelectorAll(
    "[data-suggestion]"
  ).forEach(button => {

    button.addEventListener(
      "click",
      () => {

        $("searchInput").value =
          button.dataset.suggestion;

        searchNearby();

      }
    );

  });


  document.querySelectorAll(
    "[data-search]"
  ).forEach(button => {

    button.addEventListener(
      "click",
      () => {

        openPage("discover");

        $("searchInput").value =
          button.dataset.search;

        searchNearby();

      }
    );

  });

}


/* =========================
   SEARCH NEARBY
========================= */

async function searchNearby() {

  if (state.searching) return;


  const searchText =
    $("searchInput").value.trim();


  if (!searchText) {

    showError(
      "Type what you need first, for example: pharmacy."
    );

    $("searchInput").focus();

    return;

  }


  if (!state.userLocation) {

    setStatus(
      "Getting your GPS location first...",
      "ready"
    );

    getUserLocation();

    return;

  }


  state.searching = true;


  const distanceKm =
    Number($("distanceFilter").value);


  const minRating =
    Number($("ratingFilter").value);


  showLoading(
    "Searching nearby",
    `Looking for ${searchText} within ${distanceKm} km...`
  );


  setStatus(
    `Searching for ${searchText}...`,
    "ready"
  );


  try {

    const data =
      await queryNearbyPlaces(
        searchText,
        distanceKm
      );


    let places =
      parsePlaces(data);


    places =
      filterPlaces(
        places,
        searchText,
        distanceKm,
        minRating
      );


    places =
      removeDuplicates(places);


    places.sort(
      (a,b) => a.distance - b.distance
    );


    places =
      places.slice(
        0,
        CONFIG.MAX_RESULTS
      );


    state.results = places;


    drawResultsOnMap(places);

    renderResults(places);


    $("resultCount").textContent =
      `${places.length} result${places.length === 1 ? "" : "s"}`;


    if (places.length) {

      setStatus(
        `Found ${places.length} real nearby place${places.length === 1 ? "" : "s"}.`,
        "ready"
      );

    } else {

      setStatus(
        "No matching mapped places found in this area.",
        "ready"
      );

    }

  } catch (error) {

    console.error(error);

    renderSearchError();

    setStatus(
      "Search failed. Try again in a few seconds.",
      "error"
    );

  } finally {

    state.searching = false;

    hideLoading();

  }

}


/* =========================
   BUILD OVERPASS QUERY
========================= */

function buildOverpassQuery(
  searchText,
  radius
) {

  const { lat, lon } =
    state.userLocation;


  const terms =
    getSearchTerms(searchText);


  const escaped =
    terms.map(
      term => escapeRegex(term)
    );


  const regex =
    escaped.join("|");


  return `[
out:json]
[
timeout:20
];

(
  nwr[
    name~"${regex}",i
  ](around:${radius},${lat},${lon});

  nwr[
    shop~"${regex}",i
  ](around:${radius},${lat},${lon});

  nwr[
    amenity~"${regex}",i
  ](around:${radius},${lat},${lon});

  nwr[
    craft~"${regex}",i
  ](around:${radius},${lat},${lon});

  nwr[
    office~"${regex}",i
  ](around:${radius},${lat},${lon});
);

out center tags;`;

}


/* =========================
   SEARCH TERMS
========================= */

function getSearchTerms(text) {

  const q =
    text.toLowerCase().trim();


  const aliases = {

    pharmacy: [
      "pharmacy",
      "chemist",
      "medical",
      "drugstore"
    ],

    chemist: [
      "pharmacy",
      "chemist",
      "medical"
    ],

    "hardware shop": [
      "hardware",
      "hardware shop",
      "hardware store"
    ],

    hardware: [
      "hardware",
      "hardware shop",
      "hardware store"
    ],

    plumber: [
      "plumber",
      "plumbing"
    ],

    electrician: [
      "electrician",
      "electrical"
    ],

    mechanic: [
      "mechanic",
      "car repair",
      "motorcycle repair"
    ],

    grocery: [
      "grocery",
      "supermarket",
      "convenience"
    ],

    "grocery store": [
      "grocery",
      "supermarket",
      "convenience"
    ],

    carpenter: [
      "carpenter",
      "carpentry"
    ]

  };


  if (aliases[q]) {

    return aliases[q];

  }


  return [
    q
  ];

}


/* =========================
   ESCAPE REGEX
========================= */

function escapeRegex(value) {

  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

}


/* =========================
   OVERPASS REQUEST
========================= */

async function queryNearbyPlaces(
  searchText,
  distanceKm
) {

  const radius =
    Math.round(distanceKm * 1000);


  const query =
    buildOverpassQuery(
      searchText,
      radius
    );


  let lastError = null;


  for (
    const server of CONFIG.OVERPASS_SERVERS
  ) {

    try {

      const result =
        await fetchWithTimeout(
          server,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded;charset=UTF-8"
            },

            body:
              "data=" +
              encodeURIComponent(query)
          },

          CONFIG.REQUEST_TIMEOUT

        );


      if (!result.ok) {

        throw new Error(
          `Server returned ${result.status}`
        );

      }


      const json =
        await result.json();


      if (
        json &&
        Array.isArray(json.elements)
      ) {

        return json;

      }


      throw new Error(
        "Invalid search response."
      );

    } catch (error) {

      console.warn(
        "Overpass server failed:",
        server,
        error
      );

      lastError = error;

    }

  }


  throw lastError ||
    new Error("All search servers failed.");

}


/* =========================
   FETCH TIMEOUT
========================= */

async function fetchWithTimeout(
  url,
  options,
  timeout
) {

  const controller =
    new AbortController();


  const timer =
    setTimeout(
      () => controller.abort(),
      timeout
    );


  try {

    return await fetch(
      url,
      {
        ...options,
        signal: controller.signal
      }
    );

  } finally {

    clearTimeout(timer);

  }

}


/* =========================
   PARSE PLACES
========================= */

function parsePlaces(data) {

  const elements =
    Array.isArray(data?.elements)
      ? data.elements
      : [];


  return elements
    .map(element => {

      const tags =
        element.tags || {};


      const lat =
        Number(
          element.lat ??
          element.center?.lat
        );


      const lon =
        Number(
          element.lon ??
          element.center?.lon
        );


      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
      ) {

        return null;

      }


      const name =
        tags.name ||
        tags["name:en"] ||
        "Unnamed place";


      const rating =
        parseRating(tags);


      const type =
        getPlaceType(tags);


      const address =
        buildAddress(tags);


      const phone =
        tags.phone ||
        tags["contact:phone"] ||
        "";


      const website =
        tags.website ||
        tags["contact:website"] ||
        "";


      const openingHours =
        tags.opening_hours ||
        "";


      const distance =
        haversine(
          state.userLocation.lat,
          state.userLocation.lon,
          lat,
          lon
        );


      return {

        id:
          element.id,

        name,

        type,

        lat,

        lon,

        distance,

        rating,

        address,

        phone,

        website,

        openingHours,

        tags

      };

    })

    .filter(Boolean);

}


/* =========================
   RATING
========================= */

function parseRating(tags) {

  const possible = [

    tags.rating,

    tags.stars,

    tags["contact:rating"]

  ];


  for (const value of possible) {

    if (!value) continue;


    const n =
      parseFloat(
        String(value)
          .replace(",", ".")
      );


    if (
      Number.isFinite(n) &&
      n >= 0 &&
      n <= 5
    ) {

      return n;

    }

  }


  return null;

}


/* =========================
   PLACE TYPE
========================= */

function getPlaceType(tags) {

  return (

    tags.shop ||

    tags.amenity ||

    tags.craft ||

    tags.office ||

    tags.healthcare ||

    "local place"

  );

}


/* =========================
   ADDRESS
========================= */

function buildAddress(tags) {

  const parts = [

    tags["addr:housenumber"],

    tags["addr:street"],

    tags["addr:suburb"],

    tags["addr:city"]

  ].filter(Boolean);


  if (parts.length) {

    return parts.join(", ");

  }


  return (
    tags["addr:full"] ||
    tags["addr:place"] ||
    "Address unavailable"
  );

}


/* =========================
   FILTER
========================= */

function filterPlaces(
  places,
  searchText,
  distanceKm,
  minRating
) {

  const terms =
    getSearchTerms(searchText);


  return places.filter(place => {

    if (
      place.distance >
      distanceKm
    ) {

      return false;

    }


    /*
      IMPORTANT:
      If OpenStreetMap doesn't contain
      a rating, we DO NOT invent one.
    */

    if (
      minRating > 0 &&
      place.rating !== null &&
      place.rating < minRating
    ) {

      return false;

    }


    const searchable = [

      place.name,

      place.type,

      place.address

    ]
      .join(" ")
      .toLowerCase();


    /*
      Keep places with a useful match.
    */

    const matched =
      terms.some(
        term =>
          searchable.includes(
            term.toLowerCase()
          )
      );


    return matched;

  });

}


/* =========================
   DUPLICATES
========================= */

function removeDuplicates(
  places
) {

  const seen =
    new Set();


  return places.filter(place => {

    const key =
      [
        place.name.toLowerCase(),
        place.lat.toFixed(5),
        place.lon.toFixed(5)
      ].join("|");


    if (seen.has(key)) {

      return false;

    }


    seen.add(key);

    return true;

  });

}


/* =========================
   DISTANCE
========================= */

function haversine(
  lat1,
  lon1,
  lat2,
  lon2
) {

  const R = 6371;


  const dLat =
    toRadians(lat2 - lat1);


  const dLon =
    toRadians(lon2 - lon1);


  const a =
    Math.sin(dLat / 2) ** 2 +

    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) ** 2;


  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );

}


function toRadians(deg) {

  return deg * Math.PI / 180;

}


/* =========================
   MAP RESULTS
========================= */

function drawResultsOnMap(
  places
) {

  if (!state.map) return;


  state.resultMarkers.forEach(
    marker => {

      state.map.removeLayer(marker);

    }
  );


  state.resultMarkers = [];


  places.forEach(place => {

    const marker =
      L.marker([
        place.lat,
        place.lon
      ]);


    const ratingText =
      place.rating !== null
        ? `★ ${place.rating.toFixed(1)}`
        : "Rating unavailable";


    marker.bindPopup(`

      <div class="popup-title">
        ${escapeHTML(place.name)}
      </div>

      <div class="popup-info">

        ${escapeHTML(place.type)}
        <br>

        ${place.distance.toFixed(2)} km away
        <br>

        ${escapeHTML(ratingText)}

      </div>

    `);


    marker.on(
      "click",
      () => {

        scrollToResult(place.id);

      }
    );


    marker.addTo(state.map);


    state.resultMarkers.push(
      marker
    );

  });


  if (
    state.userLocation &&
    places.length
  ) {

    const bounds =
      L.latLngBounds([
        [
          state.userLocation.lat,
          state.userLocation.lon
        ]
      ]);


    places.forEach(place => {

      bounds.extend([
        place.lat,
        place.lon
      ]);

    });


    state.map.fitBounds(
      bounds,
      {
        padding: [35,35],
        maxZoom: 16
      }
    );

  }

}


/* =========================
   RENDER RESULTS
========================= */

function renderResults(
  places
) {

  const container =
    $("results");


  if (!places.length) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">⌕</div>

        <h3>No matching places found</h3>

        <p>
          Try increasing the distance or using
          a broader search such as "pharmacy".
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML =
    places.map(place => {

      const rating =
        place.rating !== null
          ? `★ ${place.rating.toFixed(1)}`
          : "Rating unavailable";


      const phoneButton =
        place.phone
          ? `
            <button
              onclick="callPlace('${escapeAttribute(place.phone)}')"
            >
              ☎ Call
            </button>
          `
          : "";


      return `

        <article
          class="result-card"
          id="result-${place.id}"
          onclick="focusPlace(${place.id})"
        >

          <div class="result-top">

            <div>

              <div class="result-name">
                ${escapeHTML(place.name)}
              </div>

              <div class="result-type">
                ${escapeHTML(place.type)}
              </div>

            </div>

            <div class="result-distance">
              ${place.distance.toFixed(2)} km
            </div>

          </div>


          <div class="result-meta">

            <div>
              ${escapeHTML(place.address)}
            </div>

            <div>
              ${escapeHTML(rating)}
            </div>

            ${
              place.openingHours
                ? `<div>Hours: ${escapeHTML(place.openingHours)}</div>`
                : `<div>Opening hours unavailable</div>`
            }

          </div>


          <div
            class="result-actions"
            onclick="event.stopPropagation()"
          >

            <button
              onclick="openDirections(${place.lat},${place.lon})"
            >
              🧭 Directions
            </button>

            ${phoneButton}

          </div>

        </article>

      `;

    }).join("");

}


/* =========================
   FOCUS PLACE
========================= */

function focusPlace(id) {

  const place =
    state.results.find(
      item => Number(item.id) === Number(id)
    );


  if (!place) return;


  openPage("discover");


  state.map.flyTo(
    [
      place.lat,
      place.lon
    ],
    17,
    {
      duration: .7
    }
  );


  const markerIndex =
    state.results.indexOf(place);


  const marker =
    state.resultMarkers[markerIndex];


  if (marker) {

    setTimeout(
      () => marker.openPopup(),
      500
    );

  }

}


window.focusPlace = focusPlace;


/* =========================
   SCROLL RESULT
========================= */

function scrollToResult(id) {

  const element =
    document.getElementById(
      "result-" + id
    );


  if (element) {

    element.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  }

}


/* =========================
   DIRECTIONS
========================= */

function openDirections(
  lat,
  lon
) {

  let url;


  if (state.userLocation) {

    url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${state.userLocation.lat},${state.userLocation.lon}` +
      `&destination=${lat},${lon}` +
      `&travelmode=driving`;

  } else {

    url =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${lat},${lon}`;

  }


  window.open(
    url,
    "_blank",
    "noopener"
  );

}


window.openDirections = openDirections;


/* =========================
   CALL
========================= */

function callPlace(
  phone
) {

  window.location.href =
    "tel:" + phone;

}


window.callPlace = callPlace;


/* =========================
   CLEAR
========================= */

function clearResults() {

  state.results = [];


  state.resultMarkers.forEach(
    marker => {

      state.map.removeLayer(marker);

    }
  );


  state.resultMarkers = [];


  $("results").innerHTML = `

    <div class="empty-state">

      <div class="empty-icon">⌕</div>

      <h3>Nothing searched yet</h3>

      <p>
        Enter a service and press SEARCH.
      </p>

    </div>

  `;


  $("resultCount").textContent =
    "0 results";

}


function renderSearchError() {

  $("results").innerHTML = `

    <div class="empty-state">

      <div class="empty-icon">!</div>

      <h3>Search temporarily unavailable</h3>

      <p>
        Your GPS is okay, but the map-data server
        did not respond. Check your internet and
        press SEARCH again.
      </p>

    </div>

  `;

}


/* =========================
   STATUS
========================= */

function setStatus(
  text,
  type = "ready"
) {

  $("searchStatus").textContent =
    text;


  const dot =
    $("statusDot");


  dot.classList.remove(
    "ready",
    "error"
  );


  if (type) {

    dot.classList.add(type);

  }

}


/* =========================
   ERROR
========================= */

function showError(
  message
) {

  setStatus(
    message,
    "error"
  );


  /*
    Automatically return status
    after a few seconds.
  */

  setTimeout(
    () => {

      if (
        !state.searching
      ) {

        setStatus(
          "Ready",
          "ready"
        );

      }

    },
    6000
  );

}


/* =========================
   LOADING
========================= */

function showLoading(
  title,
  text
) {

  $("loadingTitle").textContent =
    title;


  $("loadingText").textContent =
    text;


  $("loadingScreen")
    .classList
    .add("show");

}


function hideLoading() {

  $("loadingScreen")
    .classList
    .remove("show");

}


/* =========================
   HTML SAFETY
========================= */

function escapeHTML(
  value
) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function escapeAttribute(
  value
) {

  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");

}


/* =========================
   HELPERS
========================= */

function initHelpers() {

  $("addHelperBtn")
    .addEventListener(
      "click",
      () => {

        $("helperModal")
          .classList
          .add("show");

      }
    );


  $("closeHelperModal")
    .addEventListener(
      "click",
      closeHelperModal
    );


  $("saveHelper")
    .addEventListener(
      "click",
      saveHelper
    );


  $("helperModal")
    .addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("helperModal")
        ) {

          closeHelperModal();

        }

      }
    );

}


function closeHelperModal() {

  $("helperModal")
    .classList
    .remove("show");

}


function saveHelper() {

  const helper = {

    id: Date.now(),

    name:
      $("helperName").value.trim(),

    service:
      $("helperService").value.trim(),

    phone:
      $("helperPhone").value.trim(),

    area:
      $("helperArea").value.trim(),

    notes:
      $("helperNotes").value.trim()

  };


  if (!helper.name) {

    alert(
      "Please enter the helper name."
    );

    return;

  }


  const helpers =
    JSON.parse(
      localStorage.getItem(
        "nexora_helpers"
      ) || "[]"
    );


  helpers.push(helper);


  localStorage.setItem(
    "nexora_helpers",
    JSON.stringify(helpers)
  );


  clearHelperForm();

  closeHelperModal();

  renderHelpers();

}


function clearHelperForm() {

  [
    "helperName",
    "helperService",
    "helperPhone",
    "helperArea",
    "helperNotes"

  ].forEach(id => {

    $(id).value = "";

  });

}


function renderHelpers() {

  const helpers =
    JSON.parse(
      localStorage.getItem(
        "nexora_helpers"
      ) || "[]"
    );


  const container =
    $("helpersList");


  if (!helpers.length) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">♙</div>

        <h3>No saved helpers</h3>

        <p>
          Add someone you trust and their
          information will stay on this device.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML =
    helpers.map(helper => `

      <div class="helper-card">

        <h3>
          ${escapeHTML(helper.name)}
        </h3>

        <div class="helper-service">
          ${escapeHTML(
            helper.service ||
            "Helper"
          )}
        </div>

        <p>
          ${escapeHTML(
            helper.area ||
            "Area not added"
          )}
        </p>

        ${
          helper.phone
            ? `
              <div class="result-actions">

                <button
                  onclick="callPlace('${escapeAttribute(helper.phone)}')"
                >
                  ☎ Call
                </button>

              </div>
            `
            : ""
        }

      </div>

    `).join("");

}


/* =========================
   INITIAL STATUS
========================= */

setTimeout(() => {

  if (
    state.map
  ) {

    state.map.invalidateSize();

  }

}, 1000);
