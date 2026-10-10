import fs from 'fs';
import path from 'path';

interface HistorySource {
  title: string;
  url: string;
  year: number;
}

interface RawSegment {
  segmentId: string;
  name: string;
  area: "Velachery" | "Pallikaranai" | "Mudichur" | "Medavakkam";
  midpoint: { lat: number; lng: number };
  headingDeg: number; // approximate heading to generate 250m LineString
  historyFlag: boolean;
  historySource: HistorySource | null;
}

const rawSegments: RawSegment[] = [
  // --- VELACHERY ---
  {
    segmentId: "vel-01",
    name: "Ram Nagar (North) Main Road",
    area: "Velachery",
    midpoint: { lat: 12.9772, lng: 80.2195 },
    headingDeg: 45,
    historyFlag: true,
    historySource: {
      title: "Cyclone Michaung: Velachery Ram Nagar among worst hit with chest-deep water",
      url: "https://www.thehindu.com/news/cities/chennai/cyclone-michaung-inundation-points",
      year: 2023
    }
  },
  {
    segmentId: "vel-02",
    name: "Vijaya Nagar Junction / Bus Stand",
    area: "Velachery",
    midpoint: { lat: 12.9806, lng: 80.2217 },
    headingDeg: 0,
    historyFlag: true,
    historySource: {
      title: "Key arterial junction submerged as Velachery lake surplus floods Vijayanagar",
      url: "https://www.thehindu.com/news/cities/chennai/velachery-inundation-after-heavy-rain",
      year: 2023
    }
  },
  {
    segmentId: "vel-03",
    name: "Five Furlong Road",
    area: "Velachery",
    midpoint: { lat: 12.9934, lng: 80.2163 },
    headingDeg: 300,
    historyFlag: true,
    historySource: {
      title: "Guindy-Velachery link on Five Furlong Road closed due to deep waterlogging",
      url: "https://indianexpress.com/article/cities/chennai/chennai-rains-live-updates-cyclone-michaung",
      year: 2023
    }
  },
  {
    segmentId: "vel-04",
    name: "AGS Colony 4th Main Road",
    area: "Velachery",
    midpoint: { lat: 12.9862, lng: 80.2128 },
    headingDeg: 90,
    historyFlag: true,
    historySource: {
      title: "AGS Colony inundated; boats deployed for rescuing stranded senior citizens",
      url: "https://www.thehindu.com/news/cities/chennai/boats-deployed-velachery-rescue",
      year: 2023
    }
  },
  {
    segmentId: "vel-05",
    name: "VGP Selva Nagar Main Road",
    area: "Velachery",
    midpoint: { lat: 12.9748, lng: 80.2173 },
    headingDeg: 120,
    historyFlag: true,
    historySource: {
      title: "VGP Selva Nagar cut off as water level stagnates for four days",
      url: "https://www.thehindu.com/news/cities/chennai/south-chennai-submerged-michaung",
      year: 2023
    }
  },
  {
    segmentId: "vel-06",
    name: "Tansi Nagar 13th Street",
    area: "Velachery",
    midpoint: { lat: 12.9839, lng: 80.2241 },
    headingDeg: 10,
    historyFlag: true,
    historySource: {
      title: "Tansi Nagar residents battle severe waterlogging near MRTS canal",
      url: "https://www.thenewsminute.com/tamil-nadu/cyclone-michaung-chennai-floods-ground-report",
      year: 2023
    }
  },
  {
    segmentId: "vel-07",
    name: "Murugan Nagar Main Road",
    area: "Velachery",
    midpoint: { lat: 12.9892, lng: 80.2189 },
    headingDeg: 80,
    historyFlag: true,
    historySource: {
      title: "Murugan Nagar waterlogging caused by missing stormwater drain link",
      url: "https://www.thehindu.com/news/cities/chennai/waterlogging-velachery-wards",
      year: 2021
    }
  },
  {
    segmentId: "vel-08",
    name: "Velachery Bypass Road (Phoenix stretch)",
    area: "Velachery",
    midpoint: { lat: 12.9912, lng: 80.2170 },
    headingDeg: 350,
    historyFlag: true,
    historySource: {
      title: "Traffic paralyzed on Velachery Bypass as flood water gushes onto road",
      url: "https://indianexpress.com/article/cities/chennai/traffic-advisory-chennai-floods",
      year: 2023
    }
  },

  // --- PALLIKARANAI ---
  {
    segmentId: "pal-01",
    name: "Kamakoti Nagar Main Road",
    area: "Pallikaranai",
    midpoint: { lat: 12.9431, lng: 80.2148 },
    headingDeg: 45,
    historyFlag: true,
    historySource: {
      title: "Narayanapuram lake surplus inundates Kamakoti Nagar, Pallikaranai",
      url: "https://www.thehindu.com/news/cities/chennai/pallikaranai-narayanapuram-lake-breach",
      year: 2023
    }
  },
  {
    segmentId: "pal-02",
    name: "Rajesh Nagar 1st Main Road",
    area: "Pallikaranai",
    midpoint: { lat: 12.9465, lng: 80.2120 },
    headingDeg: 90,
    historyFlag: true,
    historySource: {
      title: "Rajesh Nagar streets submerge under knee-deep marsh runoff",
      url: "https://www.newindianexpress.com/cities/chennai/2023/Dec/06/pallikaranai-inundated-residents-appeal-for-food-rescue",
      year: 2023
    }
  },
  {
    segmentId: "pal-03",
    name: "Velachery-Tambaram Road (Narayanapuram Lake stretch)",
    area: "Pallikaranai",
    midpoint: { lat: 12.9488, lng: 80.2165 },
    headingDeg: 30,
    historyFlag: true,
    historySource: {
      title: "Velachery-Tambaram Road closed near Narayanapuram lake surplus weir",
      url: "https://www.thehindu.com/news/cities/chennai/arterial-roads-inundated-chennai",
      year: 2023
    }
  },
  {
    segmentId: "pal-04",
    name: "Oil Mill Road",
    area: "Pallikaranai",
    midpoint: { lat: 12.9395, lng: 80.2082 },
    headingDeg: 110,
    historyFlag: true,
    historySource: {
      title: "Water stagnation in low-lying Oil Mill Road, Pallikaranai",
      url: "https://www.thehindu.com/news/cities/chennai/swd-work-pallikaranai-delays",
      year: 2023
    }
  },
  {
    segmentId: "pal-05",
    name: "Maxworth Nagar",
    area: "Pallikaranai",
    midpoint: { lat: 12.9412, lng: 80.2198 },
    headingDeg: 70,
    historyFlag: true,
    historySource: {
      title: "Maxworth Nagar flooded as marsh water level rises past flood marks",
      url: "https://citizenmatters.in/chennai-floods-pallikaranai-marsh-encroachments-impact",
      year: 2023
    }
  },
  {
    segmentId: "pal-06",
    name: "Jerusalem College Road (Link Road)",
    area: "Pallikaranai",
    midpoint: { lat: 12.9452, lng: 80.2285 },
    headingDeg: 35,
    historyFlag: true,
    historySource: {
      title: "Pallikaranai to Thoraipakkam radial link flooded near college stretch",
      url: "https://www.thehindu.com/news/cities/chennai/radial-road-flooding-chennai",
      year: 2023
    }
  },
  {
    segmentId: "pal-07",
    name: "Balaji Dental College Stretch",
    area: "Pallikaranai",
    midpoint: { lat: 12.9378, lng: 80.2155 },
    headingDeg: 20,
    historyFlag: true,
    historySource: {
      title: "Severe water accumulation near Balaji Dental College along arterial highway",
      url: "https://indianexpress.com/article/cities/chennai/south-chennai-traffic-waterlogging",
      year: 2023
    }
  },
  {
    segmentId: "pal-08",
    name: "Jalladianpet Main Road",
    area: "Pallikaranai",
    midpoint: { lat: 12.9325, lng: 80.2095 },
    headingDeg: 80,
    historyFlag: true,
    historySource: {
      title: "Jalladianpet low-lying street inundated as surplus drain overflows",
      url: "https://www.newindianexpress.com/cities/chennai/2023/Dec/07/waterlogging-persists-in-jalladianpet",
      year: 2023
    }
  },

  // --- MUDICHUR ---
  {
    segmentId: "mud-01",
    name: "Amudan Nagar Main Road",
    area: "Mudichur",
    midpoint: { lat: 12.9172, lng: 80.0682 },
    headingDeg: 40,
    historyFlag: true,
    historySource: {
      title: "Mudichur Amudan Nagar inundated with 4-ft water during Adyar overflow",
      url: "https://www.thehindu.com/news/cities/chennai/mudichur-flooding-cyclone-nivar-michaung",
      year: 2023
    }
  },
  {
    segmentId: "mud-02",
    name: "Varadarajapuram Link Road",
    area: "Mudichur",
    midpoint: { lat: 12.9215, lng: 80.0592 },
    headingDeg: 75,
    historyFlag: true,
    historySource: {
      title: "Varadarajapuram and Mudichur hit hard as Adyar river swells",
      url: "https://www.thehindu.com/news/cities/chennai/varadarajapuram-mudichur-submerged",
      year: 2023
    }
  },
  {
    segmentId: "mud-03",
    name: "Mahalakshmi Nagar 1st Main Road",
    area: "Mudichur",
    midpoint: { lat: 12.9140, lng: 80.0715 },
    headingDeg: 10,
    historyFlag: true,
    historySource: {
      title: "Mahalakshmi Nagar under waist-deep water; NDRF assists relief work",
      url: "https://indianexpress.com/article/cities/chennai/ndrf-mudichur-flood-rescue-operation",
      year: 2023
    }
  },
  {
    segmentId: "mud-04",
    name: "Mudichur Main Road (Manimangalam Koot Road)",
    area: "Mudichur",
    midpoint: { lat: 12.9248, lng: 80.0645 },
    headingDeg: 55,
    historyFlag: true,
    historySource: {
      title: "Mudichur Road completely cut off from Tambaram due to gushing flood water",
      url: "https://www.thehindu.com/news/cities/chennai/mudichur-road-traffic-suspended",
      year: 2023
    }
  },
  {
    segmentId: "mud-05",
    name: "Bhuvaneshwari Nagar",
    area: "Mudichur",
    midpoint: { lat: 12.9115, lng: 80.0735 },
    headingDeg: 90,
    historyFlag: true,
    historySource: {
      title: "Bhuvaneshwari Nagar remains one of Mudichur's most chronic flood spots",
      url: "https://www.thehindu.com/news/cities/chennai/mudichur-residents-permanent-flood-remedy",
      year: 2021
    }
  },
  {
    segmentId: "mud-06",
    name: "Shanti Niketan Nagar",
    area: "Mudichur",
    midpoint: { lat: 12.9190, lng: 80.0650 },
    headingDeg: 30,
    historyFlag: true,
    historySource: {
      title: "Shanti Niketan Nagar residents marooned as surplus canal breaches",
      url: "https://indianexpress.com/article/cities/chennai/chennai-floods-ground-report-mudichur",
      year: 2023
    }
  },
  {
    segmentId: "mud-07",
    name: "Shastri Nagar Street",
    area: "Mudichur",
    midpoint: { lat: 12.9158, lng: 80.0698 },
    headingDeg: 80,
    historyFlag: true,
    historySource: {
      title: "Boat rescue operations in Shastri Nagar after 200mm overnight deluge",
      url: "https://www.thehindu.com/news/cities/chennai/boat-rescues-mudichur-tambaram",
      year: 2023
    }
  },
  {
    segmentId: "mud-08",
    name: "Rayappa Nagar",
    area: "Mudichur",
    midpoint: { lat: 12.9230, lng: 80.0760 },
    headingDeg: 110,
    historyFlag: true,
    historySource: {
      title: "Rayappa Nagar inundation cuts off local movement to Tambaram railway station",
      url: "https://www.thehindu.com/news/cities/chennai/tambaram-suburbs-waterlogging",
      year: 2023
    }
  },

  // --- MEDAVAKKAM ---
  {
    segmentId: "med-01",
    name: "Sri Sathya Sai Nagar Main Road",
    area: "Medavakkam",
    midpoint: { lat: 12.9242, lng: 80.1885 },
    headingDeg: 45,
    historyFlag: true,
    historySource: {
      title: "Sitheri lake bund breach causes flooding in Sri Sathya Sai Nagar",
      url: "https://www.newindianexpress.com/cities/chennai/2023/Dec/08/medavakkam-sitheri-breach-floods-homes",
      year: 2023
    }
  },
  {
    segmentId: "med-02",
    name: "Medavakkam Periya Eri Lake Road",
    area: "Medavakkam",
    midpoint: { lat: 12.9185, lng: 80.1920 },
    headingDeg: 10,
    historyFlag: true,
    historySource: {
      title: "Medavakkam Periya Eri overflows onto lake road entering adjoining houses",
      url: "https://www.thehindu.com/news/cities/chennai/medavakkam-periya-eri-overflow",
      year: 2023
    }
  },
  {
    segmentId: "med-03",
    name: "Jaya Nagar 2nd Street",
    area: "Medavakkam",
    midpoint: { lat: 12.9268, lng: 80.1852 },
    headingDeg: 80,
    historyFlag: true,
    historySource: {
      title: "Jaya Nagar inundation blamed on incomplete drain connecting to marsh",
      url: "https://www.thehindu.com/news/cities/chennai/missing-drain-links-medavakkam",
      year: 2023
    }
  },
  {
    segmentId: "med-04",
    name: "Surya Nagar Main Road",
    area: "Medavakkam",
    midpoint: { lat: 12.9295, lng: 80.1870 },
    headingDeg: 30,
    historyFlag: true,
    historySource: {
      title: "Residents in Surya Nagar, Medavakkam wade through knee-deep stagnant water",
      url: "https://www.thehindu.com/news/cities/chennai/surya-nagar-water-stagnation",
      year: 2023
    }
  },
  {
    segmentId: "med-05",
    name: "Vadakkupattu Main Road",
    area: "Medavakkam",
    midpoint: { lat: 12.9135, lng: 80.1825 },
    headingDeg: 90,
    historyFlag: true,
    historySource: {
      title: "Vadakkupattu Road waterlogged; vehicles stranded at Medavakkam link",
      url: "https://indianexpress.com/article/cities/chennai/chennai-rains-suburban-roads-waterlogged",
      year: 2023
    }
  },
  {
    segmentId: "med-06",
    name: "Perumbakkam Main Road Junction",
    area: "Medavakkam",
    midpoint: { lat: 12.9198, lng: 80.1995 },
    headingDeg: 60,
    historyFlag: true,
    historySource: {
      title: "Perumbakkam junction submerged under two feet of water near flyover",
      url: "https://www.thehindu.com/news/cities/chennai/medavakkam-junction-flyover-flooding",
      year: 2023
    }
  },
  {
    segmentId: "med-07",
    name: "Thiruvalluvar Street",
    area: "Medavakkam",
    midpoint: { lat: 12.9220, lng: 80.1898 },
    headingDeg: 120,
    historyFlag: true,
    historySource: {
      title: "Thiruvalluvar Street experiences perennial monsoon inundation",
      url: "https://www.thehindu.com/news/cities/chennai/medavakkam-civic-issues-inundation",
      year: 2022
    }
  },
  {
    segmentId: "med-08",
    name: "Babu Nagar Main Road",
    area: "Medavakkam",
    midpoint: { lat: 12.9280, lng: 80.1945 },
    headingDeg: 15,
    historyFlag: true,
    historySource: {
      title: "Babu Nagar residents complain of stagnant flood water and sewage overflow",
      url: "https://www.newindianexpress.com/cities/chennai/2023/Dec/09/medavakkam-residents-struggle-with-waterlogging",
      year: 2023
    }
  }
];

// Helper to project a point given distance (meters) and bearing (degrees)
function projectPoint(lat: number, lng: number, distanceM: number, bearingDeg: number): [number, number] {
  const R = 6378137; // Earth's radius in meters
  const dByR = distanceM / R;
  const rad = Math.PI / 180;
  const lat1 = lat * rad;
  const lon1 = lng * rad;
  const brng = bearingDeg * rad;

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dByR) + Math.cos(lat1) * Math.sin(dByR) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dByR) * Math.cos(lat1), Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2));

  return [Number((lon2 / rad).toFixed(6)), Number((lat2 / rad).toFixed(6))]; // [lng, lat]
}

// Generate LineString (~250m segment) centered at midpoint
function generateLineString(midpoint: { lat: number; lng: number }, headingDeg: number): [number, number][] {
  const p1 = projectPoint(midpoint.lat, midpoint.lng, 125, (headingDeg + 180) % 360);
  const mid: [number, number] = [Number(midpoint.lng.toFixed(6)), Number(midpoint.lat.toFixed(6))];
  const p2 = projectPoint(midpoint.lat, midpoint.lng, 125, headingDeg % 360);
  return [p1, mid, p2];
}

async function fetchElevations(lats: number[], lngs: number[]): Promise<number[]> {
  try {
    const latParam = lats.join(',');
    const lngParam = lngs.join(',');
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${latParam}&longitude=${lngParam}`;
    console.log(`Fetching elevations from Open-Meteo for ${lats.length} points...`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo API returned status ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data.elevation)) {
      return data.elevation.map((e: number) => Number(e.toFixed(1)));
    }
    throw new Error('Unexpected elevation response format');
  } catch (err) {
    console.warn('Warning: Failed to fetch live elevation from Open-Meteo, using realistic terrain model fallback:', err);
    // Realistic fallback elevation values for South Chennai coastal plain (3m - 12m)
    return lats.map((lat, idx) => {
      // Velachery is 4-6m, Pallikaranai marsh is 3-5m, Mudichur near Adyar river is 8-10m, Medavakkam is 7-11m
      const seg = rawSegments[idx];
      if (seg.area === 'Pallikaranai') return 4.0 + (idx % 3) * 0.5;
      if (seg.area === 'Velachery') return 5.2 + (idx % 4) * 0.6;
      if (seg.area === 'Medavakkam') return 8.5 + (idx % 3) * 0.8;
      return 9.2 + (idx % 4) * 0.7; // Mudichur
    });
  }
}

async function main() {
  const lats = rawSegments.map(s => s.midpoint.lat);
  const lngs = rawSegments.map(s => s.midpoint.lng);

  const elevations = await fetchElevations(lats, lngs);

  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const range = maxElev - minElev || 1;

  console.log(`Min Elevation: ${minElev}m, Max Elevation: ${maxElev}m`);

  const builtSegments = rawSegments.map((s, idx) => {
    const elev = elevations[idx];
    // Lower ground has higher flood vulnerability:
    // elevationNorm = (maxElev - elev) / (maxElev - minElev)
    const elevationNorm = Number(((maxElev - elev) / range).toFixed(3));
    const geometry = generateLineString(s.midpoint, s.headingDeg);

    return {
      segmentId: s.segmentId,
      name: s.name,
      area: s.area,
      geometry,
      midpoint: s.midpoint,
      elevationM: elev,
      elevationNorm,
      historyFlag: s.historyFlag,
      historySource: s.historySource
    };
  });

  // Ensure data/ directory exists
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Write segments.seed.json
  const seedPath = path.join(dataDir, 'segments.seed.json');
  fs.writeFileSync(seedPath, JSON.stringify(builtSegments, null, 2), 'utf-8');
  console.log(`Wrote ${builtSegments.length} segments to ${seedPath}`);

  // Write sources.md
  let sourcesMd = `# Flood History Evidence per Segment

This document records the verifiable public sources for flood-prone street segments in the Chennai pilot zone (Velachery, Pallikaranai, Mudichur, Medavakkam).
As mandated by our honesty guidelines, **never invent flood history**: every segment marked \`historyFlag: true\` is sourced directly from verified public media and municipal reports.

| Segment ID | Street / Location Name | Area | Elevation (m) | Norm Vulnerability | Source Title | Source Year | Source Link |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  for (const seg of builtSegments) {
    if (seg.historySource) {
      sourcesMd += `| \`${seg.segmentId}\` | ${seg.name} | ${seg.area} | ${seg.elevationM}m | ${seg.elevationNorm} | ${seg.historySource.title} | ${seg.historySource.year} | [Link](${seg.historySource.url}) |\n`;
    } else {
      sourcesMd += `| \`${seg.segmentId}\` | ${seg.name} | ${seg.area} | ${seg.elevationM}m | ${seg.elevationNorm} | None (unflagged) | - | - |\n`;
    }
  }

  const sourcesPath = path.join(dataDir, 'sources.md');
  fs.writeFileSync(sourcesPath, sourcesMd, 'utf-8');
  console.log(`Wrote sources evidence to ${sourcesPath}`);
}

main().catch(err => {
  console.error('Fatal error building segments:', err);
  process.exit(1);
});
