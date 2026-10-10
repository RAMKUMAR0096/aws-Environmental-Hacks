# Building Chennai Flood Pulse: Street-Level Flood Intelligence on AWS

*By the Chennai Flood Pulse Team — Environmental Hacks (WeMakeDevs x AWS, Bharat Builds Tour 02)*

---

## 1. The Challenge: Urban Waterlogging in South Chennai

Every monsoon, Chennai experiences an all-too-familiar paradox: state disaster authorities issue city-wide red alerts warning that torrential rain is falling, but everyday citizens standing at an intersection or leaving their office have no way of knowing whether their commute route is submerged.

During extreme events like Cyclone Michaung (2023) and the 2015 floods, South Chennai—specifically low-lying residential corridors in **Velachery, Pallikaranai, Mudichur, and Medavakkam**—saw streets cut off under knee-to-waist-deep water. Natural drainage basins like the Pallikaranai marshland and local lakes (Velachery Lake, Narayanapuram Lake, Sitheri) spilled into adjoining roads, trapping commuters.

To address this, we set out to build **Chennai Flood Pulse**: an open, hyper-local web application that computes 3-hour street-level flood risks and guides residents along flood-avoiding safe routes.

---

## 2. Architectural Philosophy: Real AWS Services for Real Work

In hackathons, it is easy to accumulate dozens of cloud services in architectural diagrams without using them in practice. For Chennai Flood Pulse, we imposed a strict rule: **every AWS service in our stack must perform a genuine, irreplaceable job in production.**

### The System Pipeline

```
EventBridge (Every 15 min)
   │
   ▼
AWS Lambda (computeRisk)
   ├── Fetch Open-Meteo precipitation forecast (4 area centroids)
   ├── Read 32 Street Segments (DynamoDB: Segments)
   ├── Query verified citizen reports in last 2h (DynamoDB: Reports)
   ├── Compute deterministic rule-based index (0-100)
   ├── Persist to DynamoDB: Risk table & RiskHistory (TTL 90 days)
   └── If risk > threshold, publish to Amazon SNS (Area Alerts Topic)
```

### Why We Chose These AWS Services

1. **AWS Amplify Hosting:** Next.js 14 App Router deployed effortlessly with full CI/CD connected directly to our GitHub repository. Amplify manages SSR builds, custom domains, and edge distribution with minimal operational overhead.
2. **Amazon EventBridge + AWS Lambda (Node.js 20, TypeScript):** Serverless cron orchestration running every 15 minutes. It evaluates precipitation metrics across the 4 area centroids, queries active citizen reports, and computes the risk formula across all 32 street segments in under 800 milliseconds.
3. **Amazon DynamoDB:** Using on-demand capacity, DynamoDB provides sub-10ms reads and writes for our five core tables: `Segments`, `Risk`, `Reports`, `Subscriptions`, and `RiskHistory`. DynamoDB TTL automatically cleans up historical choke point logs after 90 days.
4. **Amazon Location Service:** Powers our dual-routing calculations. When our algorithm detects high- or severe-risk street segments intersecting the default driving route, it buffers those corridors into obstacle polygons and requests a safer bypass route.
5. **Amazon Bedrock (Converse API):** Citizen science is powerful, but spam and false reports corrupt flood models. When a user submits a flood photo, it is routed through Bedrock's multimodal API with a conservative system prompt to verify visible water and classify depth (none, ankle, knee, waist).
6. **Amazon S3:** Stores citizen report photos via client-side presigned URLs. A 30-day lifecycle expiration rule automatically deletes aged photos to protect user privacy.
7. **Amazon SNS:** Provides real-time email notifications for residents subscribing to specific areas, with a 3-hour deduplication buffer in Lambda to avoid alert fatigue.

---

## 3. The Math: A Transparent Rule-Based Risk Engine

A core design principle of Chennai Flood Pulse was **transparency over black-box AI**. We explicitly avoided training a synthetic machine learning model. Instead, we designed a deterministic, physical risk index combining four grounded factors:

```typescript
// 1. Rainfall metrics from Open-Meteo
const intensity = clamp(maxHourlyMm / 30, 0, 1);
const accumulation = clamp((past24hMm + next3hMm) / 120, 0, 1);
const rainScore = 0.6 * intensity + 0.4 * accumulation;

// 2. Topography & Historical Ground Truth
const terrainScore = elevationNorm; // (maxElevation - elev) / range
const historyScore = historyFlag ? 1 : 0;
const reportScore = clamp(verifiedReports2h / 3, 0, 1);

// 3. Final Risk Score & Classification
const base = 100 * rainScore * (0.40 + 0.35 * terrainScore + 0.25 * historyScore);
const finalScore = Math.round(Math.min(100, base + 25 * reportScore));
```

- **Dry Weather Cap:** If the 3-hour rainfall forecast is less than 1mm and zero citizen reports exist, the score is capped at 10 to ensure the map remains calm and reassuring on clear days.
- **Demo Mode:** Since judging may happen during dry weather, judges can toggle **"Simulate Heavy Rain (Demo)"** to inspect how the system reacts to a 28mm/h deluge without altering production database records.

---

## 4. What Fought Back (Engineering Challenges & Lessons)

Building an end-to-end cloud spatial app in under 36 hours came with real hurdles:

1. **Spatial Intersection Performance:** Evaluating spatial line-to-line intersections between dynamic driving routes and 32 street segments client-side caused stutter. We solved this by implementing Turf.js spatial buffering on the backend Lambda, buffering high-risk segments by 40 meters and merging overlapping polygons before route generation.
2. **Bedrock Multimodal JSON Parsing:** LLMs occasionally append conversational preambles to responses. We instituted strict JSON regex matching and conservative fallbacks: if an image is ambiguous or Bedrock access is unconfigured, the report is saved as `unverified` without inflating risk scores.
3. **Least Privilege IAM:** Managing separate execution roles for each Lambda in AWS SAM required precise CloudFormation policies (`DynamoDBCrudPolicy`, `S3WritePolicy`, and granular `bedrock:InvokeModel` statements).

---

## 5. Honest Limitations & The Road Ahead

We believe technology should be honest about its boundaries:
- **Pilot Scope:** The current release focuses on 32 representative street segments across 4 southern Chennai zones. It is not city-wide yet.
- **Informational Tool:** Chennai Flood Pulse is an informational routing aid. It is **not an official disaster evacuation tool**, and users should always heed directives from the Greater Chennai Corporation.
- **Future Roadmap:** Integrating physical IoT ultrasonic water level sensors, expanding to North and Central Chennai, and adding regional Tamil language audio alerts.

---

## 6. Conclusion & Acknowledgments

Chennai Flood Pulse proves that modern serverless architectures on AWS can deliver fast, reliable, life-impacting tools for climate resilience.

*Built for the WeMakeDevs x AWS Environmental Hacks Hackathon using Google Antigravity.*
