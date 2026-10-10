# CHENNAI FLOOD PULSE — SPECIFICATION

This specification serves as the architectural and functional single source of truth for **Chennai Flood Pulse**, built for the Environmental Hacks (WeMakeDevs x AWS) hackathon.

---

## 1. PRODUCT DEFINITION

**Name:** Chennai Flood Pulse  
**One-liner:** Street-level flood risk for the next 3 hours and a route that avoids flooded streets — for one Chennai pilot zone.  
**Pilot zone:** Velachery – Pallikaranai – Mudichur – Medavakkam (south Chennai, historically flood-prone).  
**Primary user:** A resident or commuter in the pilot zone during heavy rain who asks, *"Is my route safe right now?"*  
**Secondary user:** A ward/drain official who needs a ranked list of choke points.  

### Core Workflows:
1. **Live Risk Map:** Full-screen mobile-first map showing pilot-zone street segments coloured by risk (low, moderate, high, severe) with a "Last updated" timestamp.
2. **Safe Routing:** User specifies start and destination; app computes the default route and a safer alternate route avoiding high/severe risk segments (with metrics: *"Avoids 3 high-risk streets, +6 min"*).
3. **Transparent Explainability:** Tap on any segment to inspect the transparent rule-based factor breakdown (Rain, Terrain/elevation, Documented flood history, Citizen reports).
4. **Photo Flood Reporting:** Citizen captures geotagged photo -> S3 upload -> Amazon Bedrock multimodal analysis to verify visible water and estimate depth -> bumps segment risk.
5. **Officials' Hotspots Dashboard:** Top 10 choke points by risk & reports, plus historical recurring choke points and CSV export.
6. **Area Alerts:** SNS email subscription for risk threshold crossing per area.

---

## 2. ARCHITECTURE & AWS SERVICES

| Piece | AWS Service | Job |
| :--- | :--- | :--- |
| Frontend Hosting & CI/CD | **AWS Amplify Hosting** | Next.js 14 App Router, auto-deploys from GitHub |
| Risk Schedule | **Amazon EventBridge** | 15-minute cron rule triggering computeRisk Lambda |
| Serverless Compute | **AWS Lambda** (Node.js 20, TypeScript) | Risk engine, routing, report processing, APIs |
| HTTP API Gateway | **Amazon API Gateway** (HTTP API) | REST endpoints with CORS and throttling |
| Primary Database | **Amazon DynamoDB** | Segments, Risk, Reports, Subscriptions, RiskHistory |
| Media Storage | **Amazon S3** | Presigned URL photo uploads with 30-day lifecycle rule |
| Notification Service | **Amazon SNS** | Email alerts for area risk thresholds |
| Maps & Routing | **Amazon Location Service** | Map tiles & route calculation with avoid polygons |
| Multimodal AI | **Amazon Bedrock** (Converse API) | Verify flooding in photos & classify water depth |
| Observability | **Amazon CloudWatch** | Lambda logs, alarms, execution metrics |

---

## 3. DATA MODEL (DynamoDB)

### Table `Segments` (PK: `segmentId`)
```json
{
  "segmentId": "vel-01",
  "name": "Velachery Main Road (Near Vijayanagar Bus Stand)",
  "area": "Velachery",
  "geometry": [[80.2185, 12.9815], [80.2210, 12.9830]],
  "midpoint": {"lat": 12.9822, "lng": 80.2197},
  "elevationM": 4.2,
  "elevationNorm": 0.82,
  "historyFlag": true,
  "historySource": {
    "title": "Cyclone Michaung waterlogging points - GCC report",
    "url": "https://www.thehindu.com/news/cities/chennai/cyclone-michaung-inundation-points",
    "year": 2023
  }
}
```

### Table `Risk` (PK: `segmentId`)
```json
{
  "segmentId": "vel-01",
  "score": 78,
  "level": "high",
  "confidence": "high",
  "factors": {
    "rainScore": 0.85,
    "terrainScore": 0.82,
    "historyScore": 1.0,
    "reportScore": 0.33
  },
  "rain": {
    "next3hMm": 42.5,
    "maxHourlyMm": 22.0,
    "past24hMm": 65.0
  },
  "verifiedReports2h": 1,
  "updatedAt": "2026-10-10T10:30:00Z"
}
```

### Table `Reports` (PK: `reportId`, GSI: `byArea` PK: `area`, SK: `createdAt`)
```json
{
  "reportId": "rep-102",
  "segmentId": "vel-01",
  "area": "Velachery",
  "lat": 12.9821,
  "lng": 80.2195,
  "photoKey": "reports/rep-102.jpg",
  "createdAt": "2026-10-10T10:15:00Z",
  "aiVerdict": {
    "floodingVisible": true,
    "depthClass": "knee",
    "confidence": 0.88,
    "note": "Water reaching car wheel hubs along road curb.",
    "source": "bedrock"
  },
  "status": "verified"
}
```

### Table `Subscriptions` (PK: `email`, SK: `area`)
```json
{
  "email": "user@example.com",
  "area": "Velachery",
  "threshold": "high",
  "createdAt": "2026-10-10T08:00:00Z",
  "confirmed": true
}
```

### Table `RiskHistory` (PK: `segmentId`, SK: `ts`)
Stores events when risk level >= "high" with 90-day TTL for choke point tracking.

---

## 4. RISK COMPUTATION ENGINE

Inputs from Open-Meteo precipitation forecast API:
- `next3hMm` = sum(precip next 3 hours)
- `maxHourlyMm` = max(precip over next 3 hours)
- `past24hMm` = sum(precip past 24 hours)

Formulas:
```
intensity    = clamp(maxHourlyMm / 30, 0, 1)        // 30 mm/h represents torrential rain
accumulation = clamp((past24hMm + next3hMm) / 120, 0, 1)
rainScore    = 0.6 * intensity + 0.4 * accumulation // 0..1

terrainScore = elevationNorm                        // 0..1 (lower ground = higher vulnerability)
historyScore = historyFlag ? 1 : 0
reportScore  = clamp(verifiedReports2hNearSegment / 3, 0, 1)

base  = 100 * rainScore * (0.40 + 0.35 * terrainScore + 0.25 * historyScore)
score = round(min(100, base + 25 * reportScore))
level = score < 30 ? "low" : score < 60 ? "moderate" : score < 80 ? "high" : "severe"
```

Edge rules:
- If `next3hMm < 1` and `verifiedReports2h == 0` -> score capped at 10.
- If Open-Meteo API fails -> keep previous scores, set `confidence: "low"`, show UI warning banner.
- Demo mode (`?demo=heavy-rain` / `demo: true`) computes synthetic high-intensity scenario without mutating live database.

---

## 5. API CONTRACT

| Method & Path | Description |
| :--- | :--- |
| `GET /risk?demo=heavy-rain` | Returns all segments with current computed risk scores and geometries |
| `GET /risk/{segmentId}` | Detailed factor breakdown and plain-English explanation for a single segment |
| `POST /route` | Body: `{from: {lat, lng}, to: {lat, lng}, demo?: boolean}` -> returns default route, safe alternate route, avoided segments, and duration delta |
| `POST /reports/upload-url` | Returns presigned S3 PUT URL for uploading citizen flood photos |
| `POST /report` | Body: `{photoKey, lat, lng}` -> validates bounding box, triggers Bedrock verification, updates report table |
| `GET /hotspots` | Top 10 high-risk segments, citizen report tally, and historical recurring choke points |
| `POST /subscribe` | Body: `{email, area, threshold}` -> registers SNS notification subscription |

---

## 6. PHOTO REPORTING & BEDROCK AI VERIFICATION

System prompt for Amazon Bedrock Converse API:
```
You verify citizen flood reports for a city flood-warning app.
Look at the photo. Respond ONLY with JSON:
{"floodingVisible": boolean, "depthClass": "none|ankle|knee|waist|unknown",
 "confidence": number between 0 and 1, "note": "one short sentence"}
Be conservative: if the image is unclear, not a street, or you cannot judge depth, use "unknown" and lower confidence.
Do not identify any person.
```

Classification:
- `floodingVisible && confidence >= 0.6` -> `status: "verified"`
- Otherwise -> `status: "unverified"`
- Fallback: If Bedrock is unavailable, persist as `source: "unverified"`, notify user honestly: "Report saved; AI verification unavailable".
