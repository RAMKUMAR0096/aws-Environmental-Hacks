import fs from 'fs';
import path from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Segment, RiskRecord, ReportRecord, SubscriptionRecord, RiskHistoryRecord } from './types.js';

const region = process.env.AWS_REGION || 'ap-south-1';

let ddbDocClient: DynamoDBDocumentClient | null = null;
const isAwsConfigured = Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.AWS_LAMBDA_FUNCTION_NAME);

if (isAwsConfigured) {
  try {
    const rawClient = new DynamoDBClient({ region });
    ddbDocClient = DynamoDBDocumentClient.from(rawClient, {
      marshallOptions: { removeUndefinedValues: true }
    });
  } catch {
    ddbDocClient = null;
  }
}

// In-Memory store fallback for local development / testing
class MockStore {
  private segments: Map<string, Segment> = new Map();
  private risk: Map<string, RiskRecord> = new Map();
  private reports: Map<string, ReportRecord> = new Map();
  private subscriptions: Map<string, SubscriptionRecord> = new Map();
  private riskHistory: RiskHistoryRecord[] = [];

  constructor() {
    this.loadSeedSegments();
  }

  private loadSeedSegments() {
    try {
      // Look in data/segments.seed.json
      const possiblePaths = [
        path.resolve(process.cwd(), '../data/segments.seed.json'),
        path.resolve(process.cwd(), 'data/segments.seed.json'),
        path.resolve(__dirname, '../../../data/segments.seed.json'),
        path.resolve(__dirname, '../../data/segments.seed.json'),
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          const list: Segment[] = JSON.parse(raw);
          for (const s of list) {
            this.segments.set(s.segmentId, s);
          }
          break;
        }
      }
    } catch (e) {
      console.warn('Could not load seed segments into MockStore:', e);
    }
  }

  getSegments(): Segment[] {
    return Array.from(this.segments.values());
  }

  getSegment(id: string): Segment | undefined {
    return this.segments.get(id);
  }

  setSegment(s: Segment) {
    this.segments.set(s.segmentId, s);
  }

  getRisk(id: string): RiskRecord | undefined {
    return this.risk.get(id);
  }

  getAllRisk(): RiskRecord[] {
    return Array.from(this.risk.values());
  }

  setRisk(r: RiskRecord) {
    this.risk.set(r.segmentId, r);
  }

  getReports(): ReportRecord[] {
    return Array.from(this.reports.values());
  }

  addReport(rep: ReportRecord) {
    this.reports.set(rep.reportId, rep);
  }

  addSubscription(sub: SubscriptionRecord) {
    this.subscriptions.set(`${sub.email}#${sub.area}`, sub);
  }

  getSubscriptions(): SubscriptionRecord[] {
    return Array.from(this.subscriptions.values());
  }

  addRiskHistory(entry: RiskHistoryRecord) {
    this.riskHistory.push(entry);
  }

  getRiskHistory(): RiskHistoryRecord[] {
    return this.riskHistory;
  }
}

export const mockStore = new MockStore();

const SEGMENTS_TABLE = process.env.DYNAMODB_SEGMENTS_TABLE || 'ChennaiFloodPulse-Segments';
const RISK_TABLE = process.env.DYNAMODB_RISK_TABLE || 'ChennaiFloodPulse-Risk';
const REPORTS_TABLE = process.env.DYNAMODB_REPORTS_TABLE || 'ChennaiFloodPulse-Reports';
const SUBSCRIPTIONS_TABLE = process.env.DYNAMODB_SUBSCRIPTIONS_TABLE || 'ChennaiFloodPulse-Subscriptions';
const RISK_HISTORY_TABLE = process.env.DYNAMODB_RISK_HISTORY_TABLE || 'ChennaiFloodPulse-RiskHistory';

export async function getAllSegments(): Promise<Segment[]> {
  if (ddbDocClient) {
    try {
      const res = await ddbDocClient.send(new ScanCommand({ TableName: SEGMENTS_TABLE }));
      if (res.Items && res.Items.length > 0) {
        return res.Items as Segment[];
      }
    } catch (e) {
      console.warn('DynamoDB scan failed, falling back to mock store:', e);
    }
  }
  return mockStore.getSegments();
}

export async function getSegmentById(segmentId: string): Promise<Segment | null> {
  if (ddbDocClient) {
    try {
      const res = await ddbDocClient.send(new GetCommand({
        TableName: SEGMENTS_TABLE,
        Key: { segmentId }
      }));
      if (res.Item) return res.Item as Segment;
    } catch (e) {
      console.warn('DynamoDB get segment failed, fallback to mock store:', e);
    }
  }
  return mockStore.getSegment(segmentId) || null;
}

export async function getAllRiskRecords(): Promise<RiskRecord[]> {
  if (ddbDocClient) {
    try {
      const res = await ddbDocClient.send(new ScanCommand({ TableName: RISK_TABLE }));
      if (res.Items && res.Items.length > 0) {
        return res.Items as RiskRecord[];
      }
    } catch (e) {
      console.warn('DynamoDB scan risk failed, fallback to mock store:', e);
    }
  }
  return mockStore.getAllRisk();
}

export async function getRiskBySegmentId(segmentId: string): Promise<RiskRecord | null> {
  if (ddbDocClient) {
    try {
      const res = await ddbDocClient.send(new GetCommand({
        TableName: RISK_TABLE,
        Key: { segmentId }
      }));
      if (res.Item) return res.Item as RiskRecord;
    } catch (e) {
      console.warn('DynamoDB get risk failed, fallback to mock store:', e);
    }
  }
  return mockStore.getRisk(segmentId) || null;
}

export async function saveRiskRecord(record: RiskRecord): Promise<void> {
  mockStore.setRisk(record);
  if (ddbDocClient) {
    try {
      await ddbDocClient.send(new PutCommand({
        TableName: RISK_TABLE,
        Item: record
      }));
    } catch (e) {
      console.warn('DynamoDB put risk failed:', e);
    }
  }
}

export async function saveReportRecord(report: ReportRecord): Promise<void> {
  mockStore.addReport(report);
  if (ddbDocClient) {
    try {
      await ddbDocClient.send(new PutCommand({
        TableName: REPORTS_TABLE,
        Item: report
      }));
    } catch (e) {
      console.warn('DynamoDB put report failed:', e);
    }
  }
}

export async function getVerifiedReportsLast2Hours(segmentId?: string): Promise<ReportRecord[]> {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  let reports: ReportRecord[] = [];
  if (ddbDocClient) {
    try {
      const res = await ddbDocClient.send(new ScanCommand({
        TableName: REPORTS_TABLE,
        FilterExpression: '#st = :verified AND #ca >= :cutoff',
        ExpressionAttributeNames: { '#st': 'status', '#ca': 'createdAt' },
        ExpressionAttributeValues: { ':verified': 'verified', ':cutoff': cutoff }
      }));
      if (res.Items) reports = res.Items as ReportRecord[];
    } catch {
      reports = mockStore.getReports().filter(r => r.status === 'verified' && r.createdAt >= cutoff);
    }
  } else {
    reports = mockStore.getReports().filter(r => r.status === 'verified' && r.createdAt >= cutoff);
  }

  if (segmentId) {
    return reports.filter(r => r.segmentId === segmentId);
  }
  return reports;
}

export async function saveSubscription(sub: SubscriptionRecord): Promise<void> {
  mockStore.addSubscription(sub);
  if (ddbDocClient) {
    try {
      await ddbDocClient.send(new PutCommand({
        TableName: SUBSCRIPTIONS_TABLE,
        Item: sub
      }));
    } catch (e) {
      console.warn('DynamoDB put subscription failed:', e);
    }
  }
}

export async function getAllSubscriptions(): Promise<SubscriptionRecord[]> {
  if (ddbDocClient) {
    try {
      const res = await ddbDocClient.send(new ScanCommand({ TableName: SUBSCRIPTIONS_TABLE }));
      if (res.Items) return res.Items as SubscriptionRecord[];
    } catch {}
  }
  return mockStore.getSubscriptions();
}

export async function saveRiskHistory(entry: RiskHistoryRecord): Promise<void> {
  mockStore.addRiskHistory(entry);
  if (ddbDocClient) {
    try {
      await ddbDocClient.send(new PutCommand({
        TableName: RISK_HISTORY_TABLE,
        Item: {
          ...entry,
          ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60 // 90 days TTL
        }
      }));
    } catch (e) {
      console.warn('DynamoDB put risk history failed:', e);
    }
  }
}

export async function getAllRiskHistory(): Promise<RiskHistoryRecord[]> {
  if (ddbDocClient) {
    try {
      const res = await ddbDocClient.send(new ScanCommand({ TableName: RISK_HISTORY_TABLE }));
      if (res.Items) return res.Items as RiskHistoryRecord[];
    } catch {}
  }
  return mockStore.getRiskHistory();
}
