# HUMAN_TODO.md — Actions Required from You (Human)

This document collects **all manual actions and cloud credentials** needed from you. Everything else is automated.
Please review this checklist. You only need to provide credentials/access when we reach Slice 4 (Deployment & Cloud Integration). Until then, the system builds and tests using high-fidelity local mocks.

---

## 1. AWS Account & Builder Center (Hackathon Eligibility)
- [ ] Ensure you have an active AWS account (e.g. using free credits / student credits).
- [ ] If required by the Bharat Builds Tour rules, verify your student/builder profile on AWS Builder Center.

## 2. AWS Credentials & Permissions (Needed for Slice 4 Deployment)
- [ ] Install AWS CLI (`aws`) and AWS SAM CLI (`sam`) if you plan to deploy from your local terminal:
  - AWS CLI: `winget install Amazon.AWSCLI` or download from [aws.amazon.com/cli](https://aws.amazon.com/cli)
  - AWS SAM CLI: `winget install Amazon.SAM-CLI` or download from [aws.amazon.com/serverless/sam](https://aws.amazon.com/serverless/sam)
- [ ] Run `aws configure` with an IAM user or role with permissions for:
  - CloudFormation, IAM (role creation), Lambda, API Gateway, DynamoDB, S3, SNS, EventBridge, CloudWatch.
  - Recommended region: **ap-south-1 (Asia Pacific - Mumbai)**.
  - Ensure the credentials have active AWS Access Key ID, Secret Access Key, and Default Region.

## 3. Amazon Bedrock Model Access (Needed for Real AI Verification in Slice 6)
- [ ] Go to AWS Console -> **Amazon Bedrock** -> **Model access** (in region `ap-south-1` or `us-east-1` if Anthropic Claude / Amazon Nova is hosted there).
- [ ] Request access for multimodal vision models (e.g., Anthropic Claude 3 Sonnet / Claude 3 Haiku / Amazon Nova Pro).
  *Note: Bedrock model access approval is usually instant once requested in the console.*

## 4. Amazon Location Service (Needed for Production Routing & Map Style)
- [ ] (Automated in SAM template where possible, or created in Console):
  - In Amazon Location Service console, create an API Key (or use SAM-deployed key) and restrict it to your domain / localhost.
  - Or allow using the open fallback route and MapLibre OSM tiles during local development.

## 5. AWS Amplify Hosting (Frontend Deployment)
- [ ] Connect this GitHub repository (`RAMKUMAR0096/aws-Environmental-Hacks`) to **AWS Amplify Console**.
- [ ] Set frontend environment variables in Amplify Console:
  - `NEXT_PUBLIC_API_BASE_URL`: (Output URL from `sam deploy` HTTP API)
  - `NEXT_PUBLIC_MAP_STYLE_URL`: (Amazon Location Service map style URL or MapLibre default)
  - `NEXT_PUBLIC_LOCATION_API_KEY`: (Amazon Location API key)
  - `NEXT_PUBLIC_REGION`: `ap-south-1`
- [ ] Trigger deployment in Amplify.

## 6. Seed Data Review (Slice 1)
- [ ] Review `data/segments.seed.json` and `data/sources.md` once generated.
  - Confirm the ~30 flood-prone street segments in Velachery, Pallikaranai, Mudichur, and Medavakkam.
  - If you want any location removed or added, edit `data/segments.seed.json`.

## 7. Submission Preparation (Final Slice)
- [ ] Record the 3-minute video using [DEMO_SCRIPT.md](file:///d:/Ram/hackathon/aws-Environmental-Hacks/DEMO_SCRIPT.md).
- [ ] Publish the AWS Builder Center blog post using [BLOG_DRAFT.md](file:///d:/Ram/hackathon/aws-Environmental-Hacks/BLOG_DRAFT.md).
- [ ] Submit the project on Devpost / WeMakeDevs hackathon portal with the public Amplify URL and video link.
