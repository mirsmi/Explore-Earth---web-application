// Global Variables
let map;
let theMarker;
const weatherArray = [];
let previousImage;
let satelliteImageDiv;
const wordsToIgnore = [
  "kommun", "Kommune", "Municipality", "municipality", "Town of ", "City of ", "District", "district", "County", "Region of "
];
const countriesAndRegions = new CountriesAndRegions();

const OPENTWEATHER_KEY = "YOUR_KEY";
const GOOGLE_KEY = "YOUR_KEY";


// Initialize the Google Map with configurations
function setUpMap() {
  const mapProperties = {
    scrollwheel: true,
    mapTypeControl: false,
    zoomControl: true,
    center: new google.maps.LatLng(55.6050, 13.0038),
    zoom: 9,
    streetViewControl: false,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#007366" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#B0BEC5" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#004D80" }] },
      { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] }
    ],
  };

  map = new google.maps.Map(document.getElementById("googleMap"), mapProperties);
  initializeMarker();

  // Add a click listener to the map
  map.addListener("click", (mapsMouseEvent) => {
    const coordinates = mapsMouseEvent.latLng;
    const [lat, lng] = coordinates.toString().replace(/[()]/g, '').split(',').map(Number);

    resetList();
    fetchWeather(lat, lng);
    theMarker.setPosition(coordinates);
  });
}


// Fetch weather information for the given latitude and longitude
function fetchWeather(lat, lon) {
  getSatelliteImage(lat, lon);
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENTWEATHER_KEY}`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      // Populate weather data into the weatherArray
      weatherArray.push(`<li id="listItem">Current weather: ${data.weather[0].description}</li>`);
      weatherArray.push(`<li id="listItem">Temperature: ${data.main.temp}°C</li>`);
      weatherArray.push(`<li id="listItem">Max temperature: ${data.main.temp_max}°C</li>`);
      weatherArray.push(`<li id="listItem">Min temperature: ${data.main.temp_min}°C</li>`);
      weatherArray.push(`<li id="listItem">Humidity: ${data.main.humidity}%</li>`);

      if (!data.name) {
        showInfo("No Wikipedia article!", "Please choose a different place.");
      } else {
        const countryName = countriesAndRegions.getCountryOrRegionName(data.sys.country);
        fetchRegionData(lat, lon, data.name, countryName);

        // Update the marker icon to reflect the weather
        theMarker.setIcon({
          url: `http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
          scaledSize: new google.maps.Size(80, 80)
        });
      }
    })
    .catch(error => console.error('Error fetching weather data:', error));
}

// Fetch region data for Wikipedia information
function fetchRegionData(lat, lon, placeName, countryName) {
  const geoApiUrl = `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=5&appid=${OPENTWEATHER_KEY}`;

  fetch(geoApiUrl)
    .then(response => response.json())
    .then(data => {
      const regionName = data[0]?.state || null;
      filterNames(placeName, countryName, regionName);
    })
    .catch(error => console.error('Error fetching region data:', error));
}

// Display weather information on the page
function putWeatherInfo() {
  const searchList = document.getElementById("searchList");
  weatherArray.forEach(element => searchList.insertAdjacentHTML('beforeend', element));
  weatherArray.length = 0; // Clear the weather array
}

// Filter names to remove unnecessary words
function filterNames(placeName, countryName, regionName) {
  wordsToIgnore.forEach(word => {
    if (placeName.includes(word)) {
      placeName = placeName.replace(word, '').trim();
    }
  });

  countryName = countryName.replace(/ *\([^)]*\) */g, "");
  getWikipediaArticleWithRegion(placeName, regionName, countryName);
}

// Fetch a Wikipedia article for the given place and region
function getWikipediaArticleWithRegion(place, regionName, countryName) {
  const url = `https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=${place},_${regionName}&rvprop=coordinates&callback=?`;

  $.getJSON(url, data => {
    const page = Object.values(data.query.pages)[0];
    try {
      if (page?.extract) {
        showInfo(page.title, page.extract);
      } else {
        getWikipediaArticle(place, regionName, countryName);
      }
    } catch (error) {
      console.error('Error fetching Wikipedia article:', error);
    }
  });
}

// Fetch a Wikipedia article for the place without the region
function getWikipediaArticle(place, regionName, countryName) {
  const url = `https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=${place}&rvprop=coordinates&callback=?`;

  $.getJSON(url, data => {
    const page = Object.values(data.query.pages)[0];
    try {
      if (page?.extract && isValidArticle(page.extract, countryName, regionName)) {
        showInfo(page.title, page.extract);
      } else {
        getWikipediaRegion(regionName, countryName);
      }
    } catch (error) {
      console.error('Error fetching Wikipedia article:', error);
    }
  });
}

// Fetch a Wikipedia article for the region
function getWikipediaRegion(region, countryName) {
  const url = `https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=${region}&rvprop=coordinates&callback=?`;

  $.getJSON(url, data => {
    const page = Object.values(data.query.pages)[0];
    try {
      if (page?.extract && isValidArticle(page.extract, countryName)) {
        showInfo(page.title, page.extract);
      } else {
        getWikipediaCountry(countryName);
      }
    } catch (error) {
      console.error('Error fetching Wikipedia article:', error);
    }
  });
}

// Fetch a Wikipedia article for the country
function getWikipediaCountry(countryName) {
  const url = `https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=${countryName}&rvprop=coordinates&callback=?`;

  $.getJSON(url, data => {
    const page = Object.values(data.query.pages)[0];
    try {
      if (page?.extract) {
        showInfo(page.title, page.extract);
      } else {
        showInfo("Sorry", "We couldn't find any Wikipedia article! Please choose a different place.");
      }
    } catch (error) {
      console.error('Error fetching Wikipedia article:', error);
    }
  });
}

// Validate the Wikipedia article content
function isValidArticle(content, countryName, regionName = null) {
  return !content.includes("refer to ") && !content.includes("refers to ") && (content.includes(countryName) || (regionName && content.includes(regionName)));
}

// Display all information (Wikipedia, weather, and satellite image)
function showInfo(title, text) {
  document.getElementById("placeName").textContent = title;
  document.getElementById("wikiText").textContent = text;

  putWeatherInfo();
  satelliteImageDiv.appendChild(previousImage);
}

// Initialize the marker on the map
function initializeMarker() {
  theMarker = new google.maps.Marker({
    map: map,
    position: new google.maps.LatLng(55.6050, 13.0038)
  });
}

// Reset the weather and Wikipedia information
function resetList() {
  const searchList = document.getElementById("searchList");
  while (searchList.firstChild) {
    searchList.removeChild(searchList.firstChild);
  }

  document.getElementById("wikiText").textContent = '';
  document.getElementById("placeName").textContent = '';
}

// Fetch and display the satellite image for the given coordinates
async function getSatelliteImage(lat, lon) {
  const imgUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lon}&zoom=9&size=700x700&maptype=satellite&key=${GOOGLE_KEY}`;
  const satelliteImage = document.getElementById('satellite-image');

  satelliteImageDiv = satelliteImage;

  if (satelliteImage.firstChild) {
    satelliteImage.removeChild(satelliteImage.firstChild);
  }

  const img = new Image();
  img.src = imgUrl;
  img.onload = () => {
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.borderRadius = "25px";
  };

  previousImage = img;
}
