const map = L.map("map").setView([48.5, 8.0], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?lang=en", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let markers = [];

function clearMarkers() {
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
}

// Разбивает число (например, 141066 или 14101966) на варианты с точкой
function splitIntoDecimals(digits) {
  const res = [];
  const s = digits.replace(/^0+/, "");
  const base = s.length >= 2 ? s : digits;
  for (let i = 1; i < base.length; i++) {
    const v = parseFloat(base.slice(0, i) + "." + base.slice(i));
    if (!Number.isNaN(v)) res.push(v);
  }
  return res;
}

// Извлекаем широты и долготы из даты (год может быть 2–4 цифры)
function extractCoords(dateStr) {
  const parts = dateStr.split(".").map((p) => p.trim());
  if (parts.length < 3) return { lats: [], lons: [] };

  const [day, month, year] = parts;
  const digits = `${day}${month}${year}`;
  const nums = splitIntoDecimals(digits);

  const lats = [...new Set(nums.filter((v) => v <= 90))];
  const lons = [...new Set(nums.filter((v) => v <= 180))];

  return { lats, lons };
}

// Комбинируем широты одной даты с долготами другой и наоборот
function crossDatePairs(coordsA, coordsB) {
  const pairs = [];

  // A.lat + B.lon
  for (const lat of coordsA.lats) {
    for (const lon of coordsB.lons) {
      [
        [lat, lon],
        [-lat, lon],
        [lat, -lon],
        [-lat, -lon],
      ].forEach(([a, b]) => {
        if (a >= -90 && a <= 90 && b >= -180 && b <= 180)
          pairs.push([+a.toFixed(6), +b.toFixed(6)]);
      });
    }
  }

  // B.lat + A.lon
  for (const lat of coordsB.lats) {
    for (const lon of coordsA.lons) {
      [
        [lat, lon],
        [-lat, lon],
        [lat, -lon],
        [-lat, -lon],
      ].forEach(([a, b]) => {
        if (a >= -90 && a <= 90 && b >= -180 && b <= 180)
          pairs.push([+a.toFixed(6), +b.toFixed(6)]);
      });
    }
  }

  // уникальные
  const seen = new Set();
  const unique = [];
  for (const [lat, lon] of pairs) {
    const key = `${lat},${lon}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push([lat, lon]);
    }
  }
  return unique;
}

function addMarkers(coords) {
  coords.forEach(([lat, lon]) => {
    const m = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(
        `${lat},${lon} - <a href="https://www.google.com/maps/search/${lat},${lon}/@${lat},${lon},12z" target="_blank">Google Maps</a>`
      );
    markers.push(m);
  });
  if (markers.length) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

function reverseString(str) {
  // Step 1: Split the string into an array of characters.
  const charArray = str.split("");

  // Step 2: Reverse the order of elements in the array.
  const reversedArray = charArray.reverse();

  // Step 3: Join the elements of the reversed array back into a string.
  const reversedStr = reversedArray.join("");

  return reversedStr;
}

document.getElementById("generateButton").addEventListener("click", () => {
  const raw = document.getElementById("dateInput").value.trim();
  let parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length !== 2) {
    alert(
      "Введите две даты в формате: DD.MM.YYYY, DD.MM.YYYY (год может быть 2-4 цифры)"
    );
    return;
  }

  const reverse = document.getElementById("reverse").checked;
  if (reverse) {
    parts = parts.map(reverseString);
  }

  clearMarkers();

  const coordsA = extractCoords(parts[0]);
  const coordsB = extractCoords(parts[1]);

  if (
    (!coordsA.lats.length && !coordsA.lons.length) ||
    (!coordsB.lats.length && !coordsB.lons.length)
  ) {
    alert("Не удалось получить координаты из дат.");
    return;
  }

  const pairs = crossDatePairs(coordsA, coordsB);
  if (!pairs.length) {
    alert("Подходящих координат не найдено.");
    return;
  }

  addMarkers(pairs);
});
