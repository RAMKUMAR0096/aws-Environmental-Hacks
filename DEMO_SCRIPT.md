# Chennai Flood Pulse — 3-Minute Video Demo Script

> **Target Duration:** Exactly 3:00 (180 seconds)  
> **Hackathon:** Environmental Hacks (WeMakeDevs x AWS Bharat Builds Tour 02)  
> **Track:** Heat and Water  
> **Tone:** Calm, clear, honest, technical, and impact-focused.

---

### [0:00 – 0:25] The Problem & Pilot Zone (25s)

* **Visual:** Full-screen satellite / dark map of Chennai showing the pilot zone boundary (Velachery, Pallikaranai, Mudichur, Medavakkam).
* **Speaker:**
  > "During heavy monsoon rain in Chennai, city-wide alerts tell residents that *rain is falling*, but they can't answer the one critical question every commuter asks: *'Is my street flooded right now, and is my route safe?'*
  >
  > Welcome to **Chennai Flood Pulse**. We provide hyper-local, street-level flood risk for the next 3 hours and real-time safe routing that actively bypasses inundated streets across 32 seeded corridors in our South Chennai pilot zone."

---

### [0:25 – 1:30] Core User Journey: Safe Navigation & Explainability (65s)

* **Visual:** Browser showing live application. Toggle "Simulate Heavy Rain (Demo)" on. Point out the amber banner.
* **Speaker:**
  > "Since it isn't torrential rain today, I am enabling our transparent **Demo Heavy Rain scenario**—clearly marked with this top warning banner. This simulates 28mm/h peak rainfall and 95mm past accumulation.
  >
  > Notice how low-lying segments in Pallikaranai and Ram Nagar instantly update to High and Severe risk based on elevation and historical flood records.
  >
  > Let's plan a journey. I tap **'Check My Route'** and choose a route from *Vijaya Nagar Bus Terminus in Velachery* down to *Kamakoti Nagar in Pallikaranai*.
  >
  > Clicking **'Calculate Safe Route'** evaluates our street network. While the direct route takes 27 minutes, it plows directly through submerged streets along Velachery Bypass and Jerusalem College Road.
  >
  > Our routing engine calculates a safer detour: **Avoids 2 high-risk flooded streets, with a +18 minute delay**, plotting the bright green safe polyline clearly on the map.
  >
  > Tapping any segment—like *Ram Nagar North*—opens our **Transparent Factors Sheet**. There is no opaque AI guessing here: users see the exact breakdown: 68mm rain forecast, 9m elevation giving 65% terrain vulnerability, and verified flood history from *The Hindu* during Cyclone Michaung."

---

### [1:30 – 2:10] Citizen Photo Reporting & Bedrock AI Verification (40s)

* **Visual:** Tap "Report Flooding", pick a flood photo, and submit.
* **Speaker:**
  > "When water starts rising, citizens can tap **'Report Flooding'**. The app compresses the image on-device, captures GPS coordinates, and requests a secure presigned upload URL from **Amazon S3**.
  >
  > Once uploaded, our Lambda invokes **Amazon Bedrock's Converse API** with a conservative multimodal prompt. Bedrock inspects the image without storing biometric data, classifies the water depth—here, *'knee-deep water along road curb'*—and marks it verified.
  >
  > This verified report immediately bumps the street's risk score by 25 points in DynamoDB, ensuring upcoming commuters are instantly routed away."

---

### [2:10 – 2:45] Under the Hood: AWS Architecture on Screen (35s)

* **Visual:** Architecture slide (10s), then AWS Management Console tabs: DynamoDB tables (10s), CloudWatch logs & EventBridge (10s), Amplify URL (5s).
* **Speaker:**
  > "Every AWS service in Chennai Flood Pulse performs real, core work:
  > - **Amazon EventBridge** triggers our risk computation Lambda every 15 minutes.
  > - **AWS Lambda (Node 20 TypeScript)** computes the rule-based risk equations and spatial avoid-polygons.
  > - **Amazon DynamoDB** manages our on-demand tables for Segments, Risk, and Reports.
  > - **Amazon SNS** publishes email alerts when an area crosses a resident's threshold.
  > - **Amazon Location Service** powers our routing calculations.
  > - And **AWS Amplify Hosting** provides seamless CI/CD directly from our GitHub repository."

---

### [2:45 – 3:00] Impact, Honesty & Next Steps (15s)

* **Visual:** Return to live map.
* **Speaker:**
  > "In our pilot zone, 32 vulnerable segments are monitored transparently.
  >
  > While this is an informational pilot and not a replacement for official GCC evacuation orders, it gives everyday Chennai residents street-level clarity when it matters most.
  >
  > Thank you!"

---

### Post-Recording Checklist
- [ ] Video uploaded to YouTube (Unlisted or Public, High Definition 1080p).
- [ ] Tested video audio in incognito window with no sign-in required.
- [ ] Included live Amplify URL and GitHub repository link in description.
