import cors from 'cors';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAiProviderPool } from './lib/aiProviderPool.js';
import { buildTripPlanOnServer } from './lib/serverPlanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = path.resolve(__dirname, '..');

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
};

const bootstrapLocalEnv = () => {
  [
    path.join(APP_ROOT, '.env'),
    path.join(APP_ROOT, '.env.local'),
    path.join(__dirname, '.env'),
    path.join(__dirname, '.env.local'),
  ].forEach(parseEnvFile);

  if (!process.env.TRIPZY_AI_KEYS && process.env.VITE_GROQ_API_KEY) {
    process.env.TRIPZY_AI_KEYS = process.env.VITE_GROQ_API_KEY;
  }

  if (!process.env.TRIPZY_AI_MODEL && process.env.VITE_GROQ_MODEL) {
    process.env.TRIPZY_AI_MODEL = process.env.VITE_GROQ_MODEL;
  }

  if (!process.env.TRIPZY_GEOAPIFY_API_KEY && process.env.VITE_GEOAPIFY_API_KEY) {
    process.env.TRIPZY_GEOAPIFY_API_KEY = process.env.VITE_GEOAPIFY_API_KEY;
  }
};

bootstrapLocalEnv();

const PORT = Number(process.env.PORT || 4000);
const DATA_DIR =
  process.env.TRIPZY_DATA_DIR ||
  process.env.DATA_DIR ||
  (process.env.RENDER_DISK_PATH
    ? path.join(process.env.RENDER_DISK_PATH, 'tripzy-data')
    : path.join(__dirname, 'data'));
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const SHARES_FILE = path.join(DATA_DIR, 'shares.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const ITINERARIES_FILE = path.join(DATA_DIR, 'itineraries.json');
const AI_PROVIDER_STATE_FILE = path.join(DATA_DIR, 'ai-provider-state.json');
const STORAGE_SCHEMA_VERSION = 2;
const EARLY_USER_LIMIT = Math.max(1, Number(process.env.TRIPZY_EARLY_USER_LIMIT || 500) || 500);
const LAUNCH_DAY_USER_TARGET = Math.max(1, Number(process.env.TRIPZY_LAUNCH_DAY_USER_TARGET || 500) || 500);

const DEFAULT_ANALYTICS = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  visitors: {},
  plannerUsers: {},
  visitEvents: 0,
  plannerUseEvents: 0,
  itinerariesGenerated: 0,
  updatedAt: null,
};

const DEFAULT_SHARES = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  shares: {},
  updatedAt: null,
};

const DEFAULT_USERS = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  users: {},
  sessions: {},
  adminSessions: {},
  meta: {
    earlyUserLimit: EARLY_USER_LIMIT,
    earlyUsersAllocated: 0,
  },
  updatedAt: null,
};

const DEFAULT_FEEDBACK = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  entries: [],
  updatedAt: null,
};

const DEFAULT_ITINERARIES = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  entries: [],
  updatedAt: null,
};

const ensureStorage = () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  if (!fs.existsSync(ANALYTICS_FILE)) {
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(DEFAULT_ANALYTICS, null, 2));
  }

  if (!fs.existsSync(SHARES_FILE)) {
    fs.writeFileSync(SHARES_FILE, JSON.stringify(DEFAULT_SHARES, null, 2));
  }

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2));
  }

  if (!fs.existsSync(FEEDBACK_FILE)) {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(DEFAULT_FEEDBACK, null, 2));
  }

  if (!fs.existsSync(ITINERARIES_FILE)) {
    fs.writeFileSync(ITINERARIES_FILE, JSON.stringify(DEFAULT_ITINERARIES, null, 2));
  }
};

const readJsonFile = (filePath, defaultValue) => {
  ensureStorage();

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return { ...defaultValue, ...JSON.parse(raw) };
  } catch (error) {
    console.error(`Failed to read JSON store: ${filePath}`, error);
    return { ...defaultValue };
  }
};

const writeBackupSnapshot = (filePath) => {
  if (!fs.existsSync(filePath)) return;

  const backupName = `${path.basename(filePath, path.extname(filePath))}.latest.bak.json`;
  const backupPath = path.join(BACKUPS_DIR, backupName);

  try {
    fs.copyFileSync(filePath, backupPath);
  } catch (error) {
    console.error(`Failed to write backup snapshot for ${filePath}`, error);
  }
};

const writeJsonFile = (filePath, payload) => {
  ensureStorage();
  writeBackupSnapshot(filePath);
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(
    tempPath,
    JSON.stringify(
      {
        ...payload,
        schemaVersion: STORAGE_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  fs.copyFileSync(tempPath, filePath);
  fs.unlinkSync(tempPath);
};

const readAnalytics = () => readJsonFile(ANALYTICS_FILE, DEFAULT_ANALYTICS);
const writeAnalytics = (analytics) => writeJsonFile(ANALYTICS_FILE, analytics);
const readShares = () => readJsonFile(SHARES_FILE, DEFAULT_SHARES);
const writeShares = (shares) => writeJsonFile(SHARES_FILE, shares);
const readUsersStore = () => readJsonFile(USERS_FILE, DEFAULT_USERS);
const writeUsersStore = (usersStore) => writeJsonFile(USERS_FILE, usersStore);
const readFeedbackStore = () => readJsonFile(FEEDBACK_FILE, DEFAULT_FEEDBACK);
const writeFeedbackStore = (feedbackStore) => writeJsonFile(FEEDBACK_FILE, feedbackStore);
const readItinerariesStore = () => readJsonFile(ITINERARIES_FILE, DEFAULT_ITINERARIES);
const writeItinerariesStore = (itinerariesStore) => writeJsonFile(ITINERARIES_FILE, itinerariesStore);
const liveAdminSockets = new Set();

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const cleanText = (value = '', maxLength = 140) => String(value || '').trim().slice(0, maxLength);
const escapeCsvValue = (value = '') => `"${String(value ?? '').replace(/"/g, '""')}"`;
const ADMIN_USERNAME = cleanText(process.env.ADMIN_USERNAME || 'tripzy_admin', 80);
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || 'TripzyAdmin123!');
const hasAdminCredentialsConfigured = () => Boolean(ADMIN_USERNAME && ADMIN_PASSWORD);

const createId = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
const createToken = () => crypto.randomBytes(24).toString('hex');
const createSalt = () => crypto.randomBytes(16).toString('hex');
const hashPassword = (password, salt) =>
  crypto.createHash('sha256').update(`${salt}:${String(password)}`).digest('hex');

const buildTripKey = (trip = {}) =>
  [
    cleanText(trip.origin, 80).toLowerCase(),
    cleanText(trip.destination, 80).toLowerCase(),
    cleanText(trip.fromDate, 20),
    cleanText(trip.toDate, 20),
    cleanText(trip.travelMode, 30),
  ].join('|');

const toCompactTripSnapshot = (trip = {}) => ({
  tripKey: buildTripKey(trip),
  origin: cleanText(trip.origin, 80),
  destination: cleanText(trip.destination, 80),
  routeLabel: cleanText(trip.routeLabel || `${trip.origin || ''} to ${trip.destination || ''}`, 180),
  fromDate: cleanText(trip.fromDate, 20),
  toDate: cleanText(trip.toDate, 20),
  days: Number(trip.days || 0) || 0,
  budget: cleanText(trip.budget, 40),
  budgetLabel: cleanText(trip.budgetLabel, 60),
  travelMode: cleanText(trip.travelMode, 30),
  primaryMode: cleanText(trip.primaryMode, 30),
  travelStyle: cleanText(trip.travelStyle, 30),
  tripType: cleanText(trip.tripType, 30),
  pace: cleanText(trip.pace, 30),
  travelers: cleanText(trip.travelers, 20),
  totalStops: Number(trip.totalStops || 0) || 0,
  destinationImage: cleanText(trip.destinationImage, 300),
});

const getEmptyActivities = () => ({
  plannerSearches: [],
  generatedItineraries: [],
  sharedItineraries: [],
});

const getDefaultUserFlags = () => ({
  isEarlyUser: false,
  earlyUserNumber: null,
  lifetimeFree: false,
  freePlanLimit: null,
});

const sanitizeUser = (user = {}) => {
  const activities = user.activities || getEmptyActivities();
  const flags = {
    ...getDefaultUserFlags(),
    ...(user.flags || {}),
  };
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt || null,
    lastLoginAt: user.lastLoginAt || null,
    flags,
    activityCounts: {
      plannerSearches: activities.plannerSearches?.length || 0,
      generatedItineraries: activities.generatedItineraries?.length || 0,
      sharedItineraries: activities.sharedItineraries?.length || 0,
    },
    activities,
  };
};

const findUserByEmail = (usersStore, email) => {
  const normalizedEmail = normalizeEmail(email);
  return Object.values(usersStore.users || {}).find((user) => normalizeEmail(user.email) === normalizedEmail) || null;
};

const readSessionUser = (token) => {
  if (!token) return null;

  const usersStore = readUsersStore();
  const session = usersStore.sessions?.[token];
  if (!session?.userId) return null;

  const user = usersStore.users?.[session.userId];
  if (!user) return null;

  return { usersStore, user, token };
};

const readAdminSession = (token) => {
  if (!token) return null;

  const usersStore = readUsersStore();
  const session = usersStore.adminSessions?.[token];
  if (!session?.username) return null;

  return { usersStore, session, token };
};

const getTokenFromRequest = (request) => {
  const header = request.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice(7).trim();
};

const getAdminTokenFromUpgradeRequest = (request) => {
  try {
    const requestUrl = new URL(request.url || '/', 'http://localhost');
    const tokenFromQuery = cleanText(requestUrl.searchParams.get('token') || '', 120);
    if (tokenFromQuery) return tokenFromQuery;
  } catch {}

  return getTokenFromRequest(request);
};

const requireAuth = (request, response, next) => {
  const token = getTokenFromRequest(request);
  const sessionState = readSessionUser(token);

  if (!sessionState) {
    response.status(401).json({ error: 'Authentication required.' });
    return;
  }

  request.auth = sessionState;
  next();
};

const requireAdminAuth = (request, response, next) => {
  const token = getTokenFromRequest(request);
  const sessionState = readAdminSession(token);

  if (!sessionState) {
    response.status(401).json({ error: 'Admin authentication required.' });
    return;
  }

  request.adminAuth = sessionState;
  next();
};

const createWebSocketAcceptValue = (key) =>
  crypto.createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');

const encodeWebSocketFrame = (payload) => {
  const body = Buffer.from(String(payload || ''), 'utf8');

  if (body.length < 126) {
    return Buffer.concat([Buffer.from([0x81, body.length]), body]);
  }

  if (body.length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(body.length, 2);
    return Buffer.concat([header, body]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(body.length), 2);
  return Buffer.concat([header, body]);
};

const sendWebSocketJson = (socket, payload) => {
  if (!socket || socket.destroyed || !socket.writable) return;

  try {
    socket.write(encodeWebSocketFrame(JSON.stringify(payload)));
  } catch (error) {
    console.error('Failed to send websocket payload.', error);
  }
};

const buildAdminLivePayload = () => ({
  type: 'admin_overview',
  overview: buildDashboardOverview(),
  sentAt: new Date().toISOString(),
});

const broadcastAdminPayload = (payload) => {
  liveAdminSockets.forEach((socket) => {
    if (!socket || socket.destroyed || !socket.writable) {
      liveAdminSockets.delete(socket);
      return;
    }
    sendWebSocketJson(socket, payload);
  });
};

const broadcastAdminLivePayload = () => {
  broadcastAdminPayload(buildAdminLivePayload());
};

const buildAdminCounterPreviewPayload = () => {
  const overview = buildDashboardOverview();
  const limit = Number(overview.earlyUserLimit || EARLY_USER_LIMIT) || EARLY_USER_LIMIT;

  return {
    type: 'admin_counter_preview',
    overview: {
      ...overview,
      earlyUsersClaimed: limit,
      earlyUsersRemaining: 0,
    },
    sentAt: new Date().toISOString(),
  };
};

const attachOptionalAuth = (request, _response, next) => {
  const token = getTokenFromRequest(request);
  request.auth = readSessionUser(token);
  next();
};

const upsertActivity = (list = [], item = {}, extra = {}) => {
  const now = new Date().toISOString();
  const tripKey = item.tripKey || createId('trip');
  const nextItem = {
    ...item,
    ...extra,
    tripKey,
    updatedAt: now,
  };

  const currentIndex = list.findIndex((entry) => entry.tripKey === tripKey);
  if (currentIndex >= 0) {
    const existingEntry = list[currentIndex];
    list[currentIndex] = {
      ...existingEntry,
      ...nextItem,
      createdAt: existingEntry.createdAt || now,
    };
    return list;
  }

  list.unshift({
    ...nextItem,
    createdAt: now,
  });

  return list.slice(0, 12);
};

const recordUserTripActivities = (user, trip, types = []) => {
  const snapshot = toCompactTripSnapshot(trip);
  const activities = {
    ...getEmptyActivities(),
    ...(user.activities || {}),
  };

  types.forEach((type) => {
    if (type === 'planner_search') {
      activities.plannerSearches = upsertActivity(activities.plannerSearches || [], snapshot, {
        kind: 'planner_search',
      });
    }

    if (type === 'generated_itinerary') {
      activities.generatedItineraries = upsertActivity(activities.generatedItineraries || [], snapshot, {
        kind: 'generated_itinerary',
      });
    }

    if (type === 'shared_itinerary') {
      activities.sharedItineraries = upsertActivity(activities.sharedItineraries || [], snapshot, {
        kind: 'shared_itinerary',
      });
    }
  });

  user.activities = activities;
  return user;
};

const buildItineraryLogEntry = ({
  tripPlan,
  source = 'client',
  status = 'generated',
  generation = {},
  auth = null,
}) => {
  const snapshot = toCompactTripSnapshot({
    ...(tripPlan?.preferences || {}),
    ...(tripPlan || {}),
    origin: tripPlan?.origin?.name || tripPlan?.preferences?.originText || '',
    destination: tripPlan?.destination?.name || tripPlan?.preferences?.destinationText || '',
    routeLabel:
      tripPlan?.journey?.summary ||
      tripPlan?.routeLabel ||
      `${tripPlan?.origin?.name || tripPlan?.preferences?.originText || ''} to ${tripPlan?.destination?.name || tripPlan?.preferences?.destinationText || ''}`.trim(),
    primaryMode: tripPlan?.journey?.primaryMode || tripPlan?.preferences?.travelMode || '',
    destinationImage: tripPlan?.destinationImage || '',
    totalStops: Array.isArray(tripPlan?.ai?.days)
      ? tripPlan.ai.days.reduce((count, day) => count + (day.stops?.length || 0), 0)
      : Number(tripPlan?.totalStops || 0),
  });

  const itinerary = Array.isArray(tripPlan?.ai?.days) ? tripPlan.ai.days : [];
  const daysGenerated = itinerary.length || Number(tripPlan?.preferences?.days || 0) || 0;

  return {
    id: createId('itinerary'),
    createdAt: new Date().toISOString(),
    status: cleanText(status, 40) || 'generated',
    source: cleanText(source, 40) || 'client',
    userId: auth?.user?.id || '',
    userName: cleanText(auth?.user?.name || 'Guest', 80),
    userEmail: cleanText(auth?.user?.email || '', 120),
    tripKey: snapshot.tripKey,
    origin: snapshot.origin,
    destination: snapshot.destination,
    routeLabel: snapshot.routeLabel,
    fromDate: snapshot.fromDate,
    toDate: snapshot.toDate,
    days: snapshot.days,
    daysGenerated,
    budget: snapshot.budget,
    budgetLabel: snapshot.budgetLabel,
    travelMode: snapshot.travelMode,
    primaryMode: snapshot.primaryMode,
    travelStyle: snapshot.travelStyle,
    tripType: snapshot.tripType,
    pace: snapshot.pace,
    travelers: snapshot.travelers,
    totalStops: snapshot.totalStops,
    wasFallbackUsed: Boolean(generation.wasFallbackUsed),
    providerName: cleanText(generation.providerName || '', 80),
    providerSlot: cleanText(generation.providerSlot || '', 40),
    generationTimeMs: Number(generation.generationTimeMs || 0) || 0,
    estimatedInputTokens: Number(generation.estimatedInputTokens || 0) || 0,
    estimatedOutputTokens: Number(generation.estimatedOutputTokens || 0) || 0,
    estimatedCostUsd: Number(generation.estimatedCostUsd || 0) || 0,
    estimatedCostInr: Number(generation.estimatedCostInr || 0) || 0,
    estimatedTotalTokens:
      (Number(generation.estimatedInputTokens || 0) || 0) +
      (Number(generation.estimatedOutputTokens || 0) || 0),
  };
};

const recordItineraryLog = (payload) => {
  const itinerariesStore = readItinerariesStore();
  const entry = buildItineraryLogEntry(payload);
  itinerariesStore.entries = [
    entry,
    ...(Array.isArray(itinerariesStore.entries) ? itinerariesStore.entries : []),
  ].slice(0, 5000);
  writeItinerariesStore(itinerariesStore);
  broadcastAdminLivePayload();
  return entry;
};

const toCsv = (rows = []) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCsvValue).join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCsvValue(row[header])).join(','));
  });
  return lines.join('\n');
};

const buildSummary = (analytics) => ({
  uniqueVisitors: Object.keys(analytics.visitors || {}).length,
  usersWhoUsedPlanner: Object.keys(analytics.plannerUsers || {}).length,
  itinerariesGenerated: analytics.itinerariesGenerated || 0,
  totalVisitEvents: analytics.visitEvents || 0,
  totalPlannerUseEvents: analytics.plannerUseEvents || 0,
  updatedAt: analytics.updatedAt || null,
});

const buildDashboardOverview = () => {
  const analytics = readAnalytics();
  const shares = readShares();
  const usersStore = readUsersStore();
  const feedbackStore = readFeedbackStore();
  const itinerariesStore = readItinerariesStore();
  const summary = buildSummary(analytics);
  const shareEntries = Object.entries(shares.shares || {}).map(([shareId, entry]) => ({
    shareId,
    createdAt: entry.createdAt || null,
    origin: entry.tripPlan?.origin?.name || entry.tripPlan?.preferences?.originText || 'Unknown',
    destination: entry.tripPlan?.destination?.name || entry.tripPlan?.preferences?.destinationText || 'Unknown',
    days: entry.tripPlan?.preferences?.days || '--',
    budget: entry.tripPlan?.preferences?.budget || '--',
  }));
  const destinationCounts = {};

  shareEntries.forEach((entry) => {
    destinationCounts[entry.destination] = (destinationCounts[entry.destination] || 0) + 1;
  });

  const topDestinations = Object.entries(destinationCounts)
    .map(([destination, count]) => ({ destination, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const feedbackEntries = Array.isArray(feedbackStore.entries) ? feedbackStore.entries : [];
  const itineraryEntries = Array.isArray(itinerariesStore.entries) ? itinerariesStore.entries : [];
  const earlyUsersClaimed = Object.values(usersStore.users || {}).filter((user) => user.flags?.isEarlyUser).length;
  const aiUsage = aiProviderPool.getUsageSummary();
  const launchEstimate = aiProviderPool.estimateProjectedCost({ tripCount: LAUNCH_DAY_USER_TARGET });
  const averageRating = feedbackEntries.length
    ? Number(
        (
          feedbackEntries.reduce((sum, entry) => sum + (Number(entry.rating) || 0), 0) / feedbackEntries.length
        ).toFixed(1)
      )
    : 0;

  return {
    ...summary,
    totalUsers: Object.keys(usersStore.users || {}).length,
    totalShares: shareEntries.length,
    totalItineraryLogs: itineraryEntries.length,
    totalFeedbackEntries: feedbackEntries.length,
    averageFeedbackRating: averageRating,
    fallbackItineraries: itineraryEntries.filter((entry) => entry.wasFallbackUsed).length,
    earlyUsersClaimed,
    earlyUsersRemaining: Math.max(0, EARLY_USER_LIMIT - earlyUsersClaimed),
    earlyUserLimit: EARLY_USER_LIMIT,
    estimatedAiSpendInrToday: aiUsage.today.totalCostInr,
    premiumCallsToday: aiUsage.today.premiumSuccesses,
    aiDailyBudgetInr: aiUsage.dailyBudgetInr,
    premiumDailyBudgetInr: aiUsage.premiumDailyBudgetInr,
    launchDayUserTarget: LAUNCH_DAY_USER_TARGET,
    projectedLaunchDayTripCostInr: launchEstimate.averageTripCostInr,
    projectedLaunchDayTotalCostInr: launchEstimate.totalCostInr,
    projectedLaunchDayPremiumTrips: launchEstimate.premiumTrips,
    recentShares: shareEntries
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
      .slice(0, 10),
    topDestinations,
    updatedAt:
      itinerariesStore.updatedAt ||
      shares.updatedAt ||
      usersStore.updatedAt ||
      summary.updatedAt ||
      null,
  };
};

const buildAdminPanelData = () => {
  const analytics = readAnalytics();
  const shares = readShares();
  const usersStore = readUsersStore();
  const feedbackStore = readFeedbackStore();
  const itinerariesStore = readItinerariesStore();
  const overview = buildDashboardOverview();
  const aiProviders = aiProviderPool.getProviderStateSummary();
  const aiUsage = aiProviderPool.getUsageSummary();
  const launchEstimate = aiProviderPool.estimateProjectedCost({ tripCount: LAUNCH_DAY_USER_TARGET });

  const users = Object.values(usersStore.users || [])
    .map((user) => sanitizeUser(user))
    .sort((left, right) => new Date(right.lastLoginAt || right.createdAt || 0).getTime() - new Date(left.lastLoginAt || left.createdAt || 0).getTime());

  const sharesList = Object.entries(shares.shares || {})
    .map(([shareId, entry]) => ({
      shareId,
      createdAt: entry.createdAt || null,
      origin: entry.tripPlan?.origin?.name || entry.tripPlan?.preferences?.originText || 'Unknown',
      destination: entry.tripPlan?.destination?.name || entry.tripPlan?.preferences?.destinationText || 'Unknown',
      days: entry.tripPlan?.preferences?.days || '--',
      budget: entry.tripPlan?.preferences?.budget || '--',
      travelStyle: entry.tripPlan?.preferences?.travelStyle || '--',
      tripType: entry.tripPlan?.preferences?.tripType || '--',
    }))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

  const recentActivities = users
    .flatMap((user) => {
      const activities = user.activities || getEmptyActivities();
      return [
        ...(activities.plannerSearches || []).map((item) => ({
          ...item,
          type: 'Planner search',
          userName: user.name,
          userEmail: user.email,
        })),
        ...(activities.generatedItineraries || []).map((item) => ({
          ...item,
          type: 'Generated itinerary',
          userName: user.name,
          userEmail: user.email,
        })),
        ...(activities.sharedItineraries || []).map((item) => ({
          ...item,
          type: 'Shared itinerary',
          userName: user.name,
          userEmail: user.email,
        })),
      ];
    })
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())
    .slice(0, 20);

  const feedback = (Array.isArray(feedbackStore.entries) ? feedbackStore.entries : [])
    .map((entry, index) => ({
      id: entry.id || `feedback_${index}`,
      submittedAt: entry.submittedAt || null,
      userName: cleanText(entry.userName || 'Guest', 80),
      userEmail: cleanText(entry.userEmail || '', 120),
      tripOrigin: cleanText(entry.tripOrigin || '', 80),
      tripDestination: cleanText(entry.tripDestination || '', 80),
      rating: Number(entry.rating || 0) || 0,
      frustrationMoment: cleanText(entry.frustrationMoment || '', 120),
      planningProcess: cleanText(entry.planningProcess || '', 160),
      reaction: cleanText(entry.reaction || '', 160),
      shareMoment: cleanText(entry.shareMoment || '', 80),
      pricingDecision: cleanText(entry.pricingDecision || '', 320),
    }))
    .sort((left, right) => new Date(right.submittedAt || 0).getTime() - new Date(left.submittedAt || 0).getTime());

  const itineraries = (Array.isArray(itinerariesStore.entries) ? itinerariesStore.entries : [])
    .map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt || null,
      userId: cleanText(entry.userId || '', 80),
      userName: cleanText(entry.userName || 'Guest', 80),
      userEmail: cleanText(entry.userEmail || '', 120),
      origin: cleanText(entry.origin || '', 80),
      destination: cleanText(entry.destination || '', 80),
      routeLabel: cleanText(entry.routeLabel || '', 180),
      days: Number(entry.days || 0) || 0,
      daysGenerated: Number(entry.daysGenerated || 0) || 0,
      budget: cleanText(entry.budget || '', 40),
      travelMode: cleanText(entry.travelMode || '', 30),
      primaryMode: cleanText(entry.primaryMode || '', 30),
      travelStyle: cleanText(entry.travelStyle || '', 30),
      tripType: cleanText(entry.tripType || '', 30),
      pace: cleanText(entry.pace || '', 30),
      travelers: cleanText(entry.travelers || '', 20),
      totalStops: Number(entry.totalStops || 0) || 0,
      status: cleanText(entry.status || '', 40),
      source: cleanText(entry.source || '', 40),
      providerName: cleanText(entry.providerName || '', 80),
      providerSlot: cleanText(entry.providerSlot || '', 40),
      wasFallbackUsed: Boolean(entry.wasFallbackUsed),
      generationTimeMs: Number(entry.generationTimeMs || 0) || 0,
      estimatedInputTokens: Number(entry.estimatedInputTokens || 0) || 0,
      estimatedOutputTokens: Number(entry.estimatedOutputTokens || 0) || 0,
      estimatedCostUsd: Number(entry.estimatedCostUsd || 0) || 0,
      estimatedCostInr: Number(entry.estimatedCostInr || 0) || 0,
      estimatedTotalTokens: Number(entry.estimatedTotalTokens || 0) || 0,
    }))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

  return {
    admin: {
      username: ADMIN_USERNAME,
    },
    overview,
    users,
    earlyUsers: users.filter((user) => user.flags?.isEarlyUser),
    aiProviders,
    aiUsage,
    launchEstimate,
    itineraries,
    shares: sharesList,
    recentActivities,
    feedback,
  };
};

const renderDashboardHtml = (overview) => {
  const metricCards = [
    { label: 'Unique Visitors', value: overview.uniqueVisitors, accent: '#0f6a7a' },
    { label: 'Planner Users', value: overview.usersWhoUsedPlanner, accent: '#1e90a8' },
    { label: 'Itineraries', value: overview.itinerariesGenerated, accent: '#ff7a18' },
    { label: 'Shared Trips', value: overview.totalShares, accent: '#ff9a3c' },
    { label: 'Signed In Users', value: overview.totalUsers, accent: '#5dd39e' },
    { label: 'Feedback', value: overview.totalFeedbackEntries, accent: '#7c4dff' },
  ]
    .map(
      (card) => `
        <div class="metric-card">
          <div class="metric-top" style="--accent:${card.accent}">
            <span class="metric-label">${card.label}</span>
          </div>
          <div class="metric-value">${card.value}</div>
        </div>
      `
    )
    .join('');

  const topDestinations = overview.topDestinations.length
    ? overview.topDestinations
        .map((item) => {
          const width = Math.max(16, Math.round((item.count / overview.topDestinations[0].count) * 100));
          return `
            <div class="rank-row">
              <div class="rank-copy">
                <div class="rank-name">${item.destination}</div>
                <div class="rank-count">${item.count} shared trips</div>
              </div>
              <div class="rank-bar">
                <span style="width:${width}%"></span>
              </div>
            </div>
          `;
        })
        .join('')
    : '<div class="empty-state">No shared trips yet.</div>';

  const recentShares = overview.recentShares.length
    ? overview.recentShares
        .map(
          (share) => `
            <tr>
              <td><strong>${share.origin}</strong> to <strong>${share.destination}</strong></td>
              <td>${share.days} days</td>
              <td>${share.budget}</td>
              <td><code>${share.shareId}</code></td>
              <td>${share.createdAt ? new Date(share.createdAt).toLocaleString('en-IN') : '--'}</td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="5" class="empty-state">No share records yet.</td></tr>';

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Tripzy Backend Dashboard</title>
        <style>
          :root {
            color-scheme: dark;
            --bg: #0b1220;
            --card: #111a2c;
            --line: #24324a;
            --text: #f8fafc;
            --muted: #94a3b8;
            --accent: #ff7a18;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Inter, system-ui, sans-serif;
            background:
              radial-gradient(circle at top right, rgba(30,144,168,.25), transparent 30%),
              radial-gradient(circle at bottom left, rgba(255,122,24,.18), transparent 25%),
              var(--bg);
            color: var(--text);
          }
          .wrap {
            max-width: 1180px;
            margin: 0 auto;
            padding: 40px 20px 72px;
          }
          .hero {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            align-items: flex-start;
            margin-bottom: 28px;
          }
          .hero h1 {
            margin: 0;
            font-size: 42px;
            line-height: 1.05;
          }
          .hero p {
            margin: 12px 0 0;
            color: var(--muted);
            max-width: 620px;
            line-height: 1.6;
          }
          .hero-links {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }
          .hero-links a {
            color: var(--text);
            text-decoration: none;
            padding: 12px 16px;
            border-radius: 14px;
            background: rgba(255,255,255,.06);
            border: 1px solid rgba(255,255,255,.08);
          }
          .metrics {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }
          .metric-card,
          .panel {
            background: rgba(17,26,44,.92);
            border: 1px solid var(--line);
            border-radius: 24px;
            padding: 20px;
            box-shadow: 0 24px 60px rgba(0,0,0,.22);
          }
          .metric-top {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            background: color-mix(in srgb, var(--accent) 14%, transparent);
            border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
          }
          .metric-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: .12em;
            color: var(--muted);
            font-weight: 800;
          }
          .metric-value {
            margin-top: 18px;
            font-size: 40px;
            font-weight: 900;
          }
          .grid {
            display: grid;
            grid-template-columns: 1.1fr 1.4fr;
            gap: 20px;
          }
          .panel h2 {
            margin: 0 0 8px;
            font-size: 22px;
          }
          .panel p {
            margin: 0 0 18px;
            color: var(--muted);
          }
          .rank-row {
            display: grid;
            grid-template-columns: 170px 1fr;
            gap: 16px;
            align-items: center;
            margin-bottom: 16px;
          }
          .rank-name {
            font-weight: 800;
          }
          .rank-count {
            color: var(--muted);
            font-size: 13px;
            margin-top: 4px;
          }
          .rank-bar {
            height: 14px;
            background: rgba(255,255,255,.06);
            border-radius: 999px;
            overflow: hidden;
          }
          .rank-bar span {
            display: block;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, #ff7a18, #1e90a8);
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            text-align: left;
            padding: 14px 12px;
            border-bottom: 1px solid rgba(255,255,255,.08);
            font-size: 14px;
          }
          th {
            color: var(--muted);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: .12em;
          }
          code {
            font-size: 12px;
            background: rgba(255,255,255,.08);
            padding: 4px 8px;
            border-radius: 10px;
          }
          .footer {
            margin-top: 20px;
            color: var(--muted);
            font-size: 13px;
          }
          .empty-state {
            color: var(--muted);
            padding: 16px 0;
          }
          @media (max-width: 960px) {
            .metrics,
            .grid {
              grid-template-columns: 1fr;
            }
            .hero {
              flex-direction: column;
            }
            .rank-row {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="hero">
            <div>
              <h1>Tripzy Backend Dashboard</h1>
              <p>Live visual view for your backend data. You can inspect app usage, itinerary generation, signed-in users, and recent shared trips directly from the backend service.</p>
            </div>
            <div class="hero-links">
              <a href="/api/health">Health</a>
              <a href="/api/usage/summary">Usage JSON</a>
              <a href="/api/admin/overview">Admin JSON</a>
            </div>
          </div>

          <div class="metrics">${metricCards}</div>

          <div class="grid">
            <section class="panel">
              <h2>Top Shared Destinations</h2>
              <p>Destinations people shared the most from your trip planner.</p>
              ${topDestinations}
            </section>

            <section class="panel">
              <h2>Recent Shared Trips</h2>
              <p>Latest short links saved in your backend store.</p>
              <table>
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Days</th>
                    <th>Budget</th>
                    <th>Share ID</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>${recentShares}</tbody>
              </table>
            </section>
          </div>

          <div class="footer">
            Last updated: ${overview.updatedAt ? new Date(overview.updatedAt).toLocaleString('en-IN') : '--'}
          </div>
        </div>
      </body>
    </html>
  `;
};

const createShareId = () => Math.random().toString(36).slice(2, 8);

const getCorsOptions = () => {
  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!allowedOrigins.length) {
    return { origin: true };
  }

  return {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
  };
};

const app = express();
const server = createServer(app);
const aiProviderPool = createAiProviderPool({
  stateFilePath: AI_PROVIDER_STATE_FILE,
});
app.use(cors(getCorsOptions()));
app.use(express.json({ limit: '128kb' }));

app.get('/health', (_request, response) => {
  response.json({ ok: true });
});

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

const sendUsageSummary = (_request, response) => {
  const analytics = readAnalytics();
  response.json(buildSummary(analytics));
};

const trackUsage = (request, response) => {
  const { eventType, visitorId } = request.body || {};

  if (!eventType || !visitorId || typeof visitorId !== 'string') {
    response.status(400).json({ error: 'eventType and visitorId are required.' });
    return;
  }

  const analytics = readAnalytics();
  const now = new Date().toISOString();
  const normalizedVisitorId = visitorId.trim().slice(0, 120);

  if (!normalizedVisitorId) {
    response.status(400).json({ error: 'visitorId cannot be empty.' });
    return;
  }

  analytics.visitors[normalizedVisitorId] = {
    firstSeen: analytics.visitors[normalizedVisitorId]?.firstSeen || now,
    lastSeen: now,
  };

  switch (eventType) {
    case 'visit':
      analytics.visitEvents = (analytics.visitEvents || 0) + 1;
      break;
    case 'planner_use':
      analytics.plannerUseEvents = (analytics.plannerUseEvents || 0) + 1;
      analytics.plannerUsers[normalizedVisitorId] = {
        firstUsedAt: analytics.plannerUsers[normalizedVisitorId]?.firstUsedAt || now,
        lastUsedAt: now,
      };
      break;
    case 'itinerary_generated':
      analytics.itinerariesGenerated = (analytics.itinerariesGenerated || 0) + 1;
      analytics.plannerUsers[normalizedVisitorId] = {
        firstUsedAt: analytics.plannerUsers[normalizedVisitorId]?.firstUsedAt || now,
        lastUsedAt: now,
      };
      break;
    default:
      response.status(400).json({ error: 'Unsupported eventType.' });
      return;
  }

  writeAnalytics(analytics);
  broadcastAdminLivePayload();
  response.status(202).json(buildSummary(analytics));
};

app.get('/api/usage/summary', sendUsageSummary);
app.get('/api/analytics/summary', sendUsageSummary);
app.post('/api/usage/track', trackUsage);
app.post('/api/analytics/track', trackUsage);

app.post('/api/auth/signup', (request, response) => {
  const { name, email, password } = request.body || {};
  const normalizedEmail = normalizeEmail(email);
  const cleanName = cleanText(name, 80);

  if (!cleanName || normalizedEmail.length < 5 || String(password || '').length < 6) {
    response.status(400).json({ error: 'Name, valid email, and 6+ character password are required.' });
    return;
  }

  const usersStore = readUsersStore();
  if (findUserByEmail(usersStore, normalizedEmail)) {
    response.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const userId = createId('user');
  const salt = createSalt();
  const now = new Date().toISOString();
  const earlyUsersAllocated = Number(usersStore.meta?.earlyUsersAllocated || 0) || 0;
  const isEarlyUser = earlyUsersAllocated < EARLY_USER_LIMIT;
  const nextEarlyUserNumber = isEarlyUser ? earlyUsersAllocated + 1 : null;
  usersStore.users[userId] = {
    id: userId,
    name: cleanName,
    email: normalizedEmail,
    passwordHash: hashPassword(password, salt),
    passwordSalt: salt,
    createdAt: now,
    lastLoginAt: now,
    activities: getEmptyActivities(),
    flags: {
      isEarlyUser,
      earlyUserNumber: nextEarlyUserNumber,
      lifetimeFree: isEarlyUser,
      freePlanLimit: isEarlyUser ? 'lifetime' : null,
    },
  };
  usersStore.meta = {
    earlyUserLimit: EARLY_USER_LIMIT,
    earlyUsersAllocated: isEarlyUser ? nextEarlyUserNumber : earlyUsersAllocated,
  };

  const token = createToken();
  usersStore.sessions[token] = {
    userId,
    createdAt: now,
  };

  writeUsersStore(usersStore);
  broadcastAdminLivePayload();
  response.status(201).json({
    token,
    user: sanitizeUser(usersStore.users[userId]),
  });
});

app.post('/api/auth/signin', (request, response) => {
  const { email, password } = request.body || {};
  const usersStore = readUsersStore();
  const user = findUserByEmail(usersStore, email);

  if (!user) {
    response.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const expectedHash = hashPassword(password, user.passwordSalt);
  if (expectedHash !== user.passwordHash) {
    response.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = createToken();
  const now = new Date().toISOString();
  user.lastLoginAt = now;
  usersStore.sessions[token] = {
    userId: user.id,
    createdAt: now,
  };

  writeUsersStore(usersStore);
  response.json({
    token,
    user: sanitizeUser(user),
  });
});

app.get('/api/auth/me', requireAuth, (request, response) => {
  response.json({
    user: sanitizeUser(request.auth.user),
  });
});

app.post('/api/auth/signout', requireAuth, (request, response) => {
  delete request.auth.usersStore.sessions[request.auth.token];
  writeUsersStore(request.auth.usersStore);
  response.status(204).end();
});

app.post('/api/auth/activity', requireAuth, (request, response) => {
  const { trip, types } = request.body || {};
  const normalizedTypes = Array.isArray(types)
    ? types.filter((value) => ['planner_search', 'generated_itinerary', 'shared_itinerary'].includes(value))
    : [];

  if (!trip || typeof trip !== 'object' || !normalizedTypes.length) {
    response.status(400).json({ error: 'trip and valid activity types are required.' });
    return;
  }

  recordUserTripActivities(request.auth.user, trip, normalizedTypes);
  writeUsersStore(request.auth.usersStore);
  response.status(202).json({
    user: sanitizeUser(request.auth.user),
  });
});

app.post('/api/feedback', (request, response) => {
  const {
    rating,
    frustrationMoment,
    planningProcess,
    reaction,
    shareMoment,
    pricingDecision,
    tripOrigin,
    tripDestination,
    userName,
    userEmail,
  } = request.body || {};

  if (
    !(Number(rating) > 0) ||
    !cleanText(frustrationMoment) ||
    !cleanText(planningProcess, 200) ||
    !cleanText(reaction, 200) ||
    !cleanText(shareMoment, 80) ||
    !cleanText(pricingDecision, 400)
  ) {
    response.status(400).json({ error: 'Complete feedback answers are required.' });
    return;
  }

  const feedbackStore = readFeedbackStore();
  feedbackStore.entries = [
    {
      id: createId('feedback'),
      rating: Number(rating),
      frustrationMoment: cleanText(frustrationMoment, 140),
      planningProcess: cleanText(planningProcess, 200),
      reaction: cleanText(reaction, 200),
      shareMoment: cleanText(shareMoment, 80),
      pricingDecision: cleanText(pricingDecision, 400),
      tripOrigin: cleanText(tripOrigin, 80),
      tripDestination: cleanText(tripDestination, 80),
      userName: cleanText(userName, 80),
      userEmail: cleanText(userEmail, 120),
      submittedAt: new Date().toISOString(),
    },
    ...(Array.isArray(feedbackStore.entries) ? feedbackStore.entries : []),
  ].slice(0, 500);

  writeFeedbackStore(feedbackStore);
  broadcastAdminLivePayload();
  response.status(201).json({ ok: true });
});

app.post('/api/itineraries/log', attachOptionalAuth, (request, response) => {
  const { tripPlan, source, status, generation } = request.body || {};

  if (!tripPlan || typeof tripPlan !== 'object') {
    response.status(400).json({ error: 'tripPlan is required.' });
    return;
  }

  const entry = recordItineraryLog({
    tripPlan,
    source,
    status,
    generation,
    auth: request.auth,
  });

  response.status(201).json({
    ok: true,
    itinerary: entry,
  });
});

app.post('/api/planner/ai-itinerary', attachOptionalAuth, async (request, response) => {
  const { prompt, maxTokens, temperature } = request.body || {};

  if (!cleanText(prompt, 50000)) {
    response.status(400).json({ error: 'prompt is required.' });
    return;
  }

  const result = await aiProviderPool.requestCompletion({
    prompt: String(prompt),
    maxTokens: Math.max(300, Math.min(Number(maxTokens || 900) || 900, 2400)),
    temperature: typeof temperature === 'number' ? temperature : 0.1,
  });

  if (!result.ok) {
    response.status(503).json({
      ok: false,
      useFallback: true,
      error: result.error,
      attempts: result.attempts || [],
      generation: {
        providerName: 'fallback_dataset',
        providerSlot: 'fallback',
        wasFallbackUsed: true,
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
      },
    });
    return;
  }

  response.json({
    ok: true,
    content: result.content,
    attempts: result.attempts || [],
    generation: result.generation,
  });
});

app.post('/api/planner/build', attachOptionalAuth, async (request, response) => {
  const { preferences } = request.body || {};

  if (!preferences || typeof preferences !== 'object') {
    response.status(400).json({ error: 'preferences are required.' });
    return;
  }

  try {
    const tripPlan = await buildTripPlanOnServer({
      preferences: {
        originText: cleanText(preferences.originText || 'Current location', 120),
        destinationText: cleanText(preferences.destinationText || '', 120),
        fromDate: cleanText(preferences.fromDate || '', 20),
        toDate: cleanText(preferences.toDate || '', 20),
        days: Math.max(1, Math.min(Number(preferences.days || 3) || 3, 14)),
        budget: cleanText(preferences.budget || 'Medium', 20),
        travelMode: cleanText(preferences.travelMode || 'Smart', 20),
        travelStyle: cleanText(preferences.travelStyle || 'Relaxed', 20),
        interests: Array.isArray(preferences.interests)
          ? preferences.interests.map((value) => cleanText(value, 40)).filter(Boolean).slice(0, 8)
          : [],
        travelers: cleanText(preferences.travelers || '1', 20),
        tripType: cleanText(preferences.tripType || 'Relaxed', 20),
        pace: cleanText(preferences.pace || 'Moderate', 20),
      },
      aiRequester: (payload) => aiProviderPool.requestCompletion(payload),
    });

    response.json({
      ok: true,
      tripPlan,
    });
  } catch (error) {
    console.error('Server planner build failed.', error);
    response.status(500).json({
      ok: false,
      error: error?.message || 'Could not build the trip plan on the backend.',
    });
  }
});

app.post('/api/admin/auth/signin', (request, response) => {
  const { username, password } = request.body || {};

  if (!hasAdminCredentialsConfigured()) {
    response.status(503).json({ error: 'Admin credentials are not configured on the backend yet.' });
    return;
  }

  if (cleanText(username, 80) !== ADMIN_USERNAME || String(password || '') !== ADMIN_PASSWORD) {
    response.status(401).json({ error: 'Invalid admin credentials.' });
    return;
  }

  const usersStore = readUsersStore();
  const token = createToken();
  usersStore.adminSessions[token] = {
    username: ADMIN_USERNAME,
    createdAt: new Date().toISOString(),
  };
  writeUsersStore(usersStore);

  response.json({
    token,
    admin: {
      username: ADMIN_USERNAME,
    },
  });
});

app.get('/api/admin/auth/me', requireAdminAuth, (request, response) => {
  response.json({
    admin: {
      username: request.adminAuth.session.username,
      signedInAt: request.adminAuth.session.createdAt,
    },
  });
});

app.post('/api/admin/auth/signout', requireAdminAuth, (request, response) => {
  delete request.adminAuth.usersStore.adminSessions[request.adminAuth.token];
  writeUsersStore(request.adminAuth.usersStore);
  response.status(204).end();
});

app.get('/api/admin/overview', (_request, response) => {
  response.json(buildDashboardOverview());
});

app.get('/api/admin/panel', requireAdminAuth, (_request, response) => {
  response.json(buildAdminPanelData());
});

app.get('/api/admin/providers', requireAdminAuth, (_request, response) => {
  response.json({
    providers: aiProviderPool.getProviderStateSummary(),
  });
});

app.post('/api/admin/live-counter/test', requireAdminAuth, (_request, response) => {
  const payload = buildAdminCounterPreviewPayload();
  broadcastAdminPayload(payload);
  response.json({
    ok: true,
    preview: payload.overview,
  });
});

app.get('/api/admin/export/:resource.:format', requireAdminAuth, (request, response) => {
  const resource = cleanText(request.params.resource, 40);
  const format = cleanText(request.params.format, 20).toLowerCase();

  if (!['users', 'itineraries'].includes(resource) || !['csv', 'json'].includes(format)) {
    response.status(400).json({ error: 'Unsupported export resource or format.' });
    return;
  }

  if (resource === 'users') {
    const users = Object.values(readUsersStore().users || {}).map((user) => {
      const safeUser = sanitizeUser(user);
      return {
        id: safeUser.id,
        name: safeUser.name,
        email: safeUser.email,
        createdAt: safeUser.createdAt,
        lastLoginAt: safeUser.lastLoginAt,
        isEarlyUser: safeUser.flags?.isEarlyUser ? 'yes' : 'no',
        earlyUserNumber: safeUser.flags?.earlyUserNumber || '',
        lifetimeFree: safeUser.flags?.lifetimeFree ? 'yes' : 'no',
        plannerSearches: safeUser.activityCounts?.plannerSearches || 0,
        generatedItineraries: safeUser.activityCounts?.generatedItineraries || 0,
        sharedItineraries: safeUser.activityCounts?.sharedItineraries || 0,
      };
    });

    if (format === 'json') {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Content-Disposition', 'attachment; filename="tripzy-users-export.json"');
      response.send(JSON.stringify(users, null, 2));
      return;
    }

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="tripzy-users-export.csv"');
    response.send(toCsv(users));
    return;
  }

  const itineraries = (readItinerariesStore().entries || []).map((entry) => ({
    id: entry.id,
    createdAt: entry.createdAt || '',
    userId: entry.userId || '',
    userName: entry.userName || '',
    userEmail: entry.userEmail || '',
    origin: entry.origin || '',
    destination: entry.destination || '',
    routeLabel: entry.routeLabel || '',
    days: entry.days || 0,
    budget: entry.budget || '',
    travelMode: entry.travelMode || '',
    primaryMode: entry.primaryMode || '',
    providerName: entry.providerName || '',
    providerSlot: entry.providerSlot || '',
    wasFallbackUsed: entry.wasFallbackUsed ? 'yes' : 'no',
    estimatedInputTokens: entry.estimatedInputTokens || 0,
    estimatedOutputTokens: entry.estimatedOutputTokens || 0,
    estimatedTotalTokens: entry.estimatedTotalTokens || 0,
    generationTimeMs: entry.generationTimeMs || 0,
  }));

  if (format === 'json') {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="tripzy-itineraries-export.json"');
    response.send(JSON.stringify(itineraries, null, 2));
    return;
  }

  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', 'attachment; filename="tripzy-itineraries-export.csv"');
  response.send(toCsv(itineraries));
});

app.get('/dashboard', (_request, response) => {
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.send(renderDashboardHtml(buildDashboardOverview()));
});

app.get('/', (_request, response) => {
  response.redirect('/dashboard');
});

app.post('/api/share', (request, response) => {
  const { tripPlan } = request.body || {};

  if (!tripPlan || typeof tripPlan !== 'object') {
    response.status(400).json({ error: 'tripPlan is required.' });
    return;
  }

  const shares = readShares();
  let shareId = createShareId();

  while (shares.shares[shareId]) {
    shareId = createShareId();
  }

  shares.shares[shareId] = {
    tripPlan,
    createdAt: new Date().toISOString(),
  };

  writeShares(shares);
  response.status(201).json({ shareId });
});

app.get('/api/share/:shareId', (request, response) => {
  const shares = readShares();
  const sharedEntry = shares.shares[request.params.shareId];

  if (!sharedEntry?.tripPlan) {
    response.status(404).json({ error: 'Share not found.' });
    return;
  }

  response.json({
    shareId: request.params.shareId,
    tripPlan: sharedEntry.tripPlan,
  });
});

ensureStorage();

server.on('upgrade', (request, socket) => {
  try {
    const requestUrl = new URL(request.url || '/', 'http://localhost');

    if (requestUrl.pathname !== '/ws/admin-live') {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    const token = getAdminTokenFromUpgradeRequest(request);
    const sessionState = readAdminSession(token);
    const upgradeHeader = String(request.headers.upgrade || '').toLowerCase();
    const socketKey = String(request.headers['sec-websocket-key'] || '').trim();

    if (!sessionState || upgradeHeader !== 'websocket' || !socketKey) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const acceptValue = createWebSocketAcceptValue(socketKey);
    socket.write(
      [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptValue}`,
        '\r\n',
      ].join('\r\n')
    );

    liveAdminSockets.add(socket);
    sendWebSocketJson(socket, buildAdminLivePayload());

    socket.on('close', () => {
      liveAdminSockets.delete(socket);
    });

    socket.on('end', () => {
      liveAdminSockets.delete(socket);
    });

    socket.on('error', () => {
      liveAdminSockets.delete(socket);
    });

    socket.on('data', (chunk) => {
      if (!Buffer.isBuffer(chunk) || chunk.length < 2) return;
      const opcode = chunk[0] & 0x0f;

      if (opcode === 0x8) {
        liveAdminSockets.delete(socket);
        socket.end();
        return;
      }

      if (opcode === 0x9) {
        socket.write(Buffer.from([0x8a, 0x00]));
      }
    });
  } catch (error) {
    console.error('Admin live websocket upgrade failed.', error);
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Tripzy backend running on port ${PORT}`);
});
