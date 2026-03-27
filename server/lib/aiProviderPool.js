import fs from 'fs';
import path from 'path';

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_COOLDOWN_MS = 120000;
const DEFAULT_PROVIDER_STATE = {
  schemaVersion: 2,
  providers: {},
  dailyUsage: {},
  updatedAt: null,
};

const cleanText = (value = '', maxLength = 240) => String(value || '').trim().slice(0, maxLength);
const estimateTokenCount = (value = '') => Math.max(0, Math.round(String(value || '').trim().length / 4));
const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ensureStateFile = (filePath) => {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_PROVIDER_STATE, null, 2));
  }
};

const readState = (filePath) => {
  ensureStateFile(filePath);

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return { ...DEFAULT_PROVIDER_STATE, ...JSON.parse(raw) };
  } catch (error) {
    console.error(`Failed to read AI provider state from ${filePath}`, error);
    return { ...DEFAULT_PROVIDER_STATE };
  }
};

const writeState = (filePath, state) => {
  ensureStateFile(filePath);
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(
    tempPath,
    JSON.stringify(
      {
        ...state,
        schemaVersion: DEFAULT_PROVIDER_STATE.schemaVersion,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  fs.copyFileSync(tempPath, filePath);
  fs.unlinkSync(tempPath);
};

const splitKeys = (value = '') =>
  String(value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const getPricingConfig = () => ({
  standardInputUsdPerMillion: parseNumber(process.env.TRIPZY_AI_INPUT_COST_PER_MILLION, 0.05),
  standardOutputUsdPerMillion: parseNumber(process.env.TRIPZY_AI_OUTPUT_COST_PER_MILLION, 0.08),
  premiumInputUsdPerMillion: parseNumber(process.env.TRIPZY_AI_PREMIUM_INPUT_COST_PER_MILLION, parseNumber(process.env.TRIPZY_AI_INPUT_COST_PER_MILLION, 0.05)),
  premiumOutputUsdPerMillion: parseNumber(process.env.TRIPZY_AI_PREMIUM_OUTPUT_COST_PER_MILLION, parseNumber(process.env.TRIPZY_AI_OUTPUT_COST_PER_MILLION, 0.08)),
  reserveInputUsdPerMillion: parseNumber(process.env.TRIPZY_AI_RESERVE_INPUT_COST_PER_MILLION, 0.1),
  reserveOutputUsdPerMillion: parseNumber(process.env.TRIPZY_AI_RESERVE_OUTPUT_COST_PER_MILLION, 0.4),
  usdToInr: parseNumber(process.env.TRIPZY_USD_TO_INR, 83),
  dailyBudgetInr: Math.max(0, parseNumber(process.env.TRIPZY_AI_DAILY_BUDGET_INR, 0)),
  premiumDailyBudgetInr: Math.max(0, parseNumber(process.env.TRIPZY_AI_PREMIUM_DAILY_BUDGET_INR, 0)),
  premiumMaxCallsPerDay: Math.max(0, parseNumber(process.env.TRIPZY_AI_PREMIUM_MAX_CALLS_PER_DAY, 0)),
  reserveDailyBudgetInr: Math.max(0, parseNumber(process.env.TRIPZY_AI_RESERVE_DAILY_BUDGET_INR, 0)),
  reserveMaxCallsPerDay: Math.max(0, parseNumber(process.env.TRIPZY_AI_RESERVE_MAX_CALLS_PER_DAY, 0)),
});

const buildProviderPool = () => {
  const baseUrl = cleanText(
    process.env.TRIPZY_AI_BASE_URL || 'https://api.groq.com/openai/v1/chat/completions',
    300
  );
  const model = cleanText(process.env.TRIPZY_AI_MODEL || 'llama-3.1-8b-instant', 120);
  const timeoutMs = Math.max(1500, parseNumber(process.env.TRIPZY_AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);
  const cooldownMs = Math.max(5000, parseNumber(process.env.TRIPZY_AI_COOLDOWN_MS, DEFAULT_COOLDOWN_MS) || DEFAULT_COOLDOWN_MS);
  const pricing = getPricingConfig();

  const standardProviders = splitKeys(process.env.TRIPZY_AI_KEYS).map((apiKey, index) => ({
    slot: `standard_${index + 1}`,
    tier: 'standard',
    providerFamily: 'groq',
    apiFormat: 'openai_compat',
    apiKey,
    baseUrl,
    model,
    timeoutMs,
    cooldownMs,
    inputUsdPerMillion: pricing.standardInputUsdPerMillion,
    outputUsdPerMillion: pricing.standardOutputUsdPerMillion,
  }));

  const premiumKey = cleanText(process.env.TRIPZY_AI_PREMIUM_KEY || '', 240);
  const premiumModel = cleanText(process.env.TRIPZY_AI_PREMIUM_MODEL || model, 120);
  const premiumBaseUrl = cleanText(process.env.TRIPZY_AI_PREMIUM_BASE_URL || baseUrl, 300);

  const premiumProviders = premiumKey
    ? [
        {
          slot: 'premium_1',
          tier: 'premium',
          providerFamily: 'groq',
          apiFormat: 'openai_compat',
          apiKey: premiumKey,
          baseUrl: premiumBaseUrl,
          model: premiumModel,
          timeoutMs: Math.max(timeoutMs, 2500),
          cooldownMs: Math.max(cooldownMs, 30000),
          inputUsdPerMillion: pricing.premiumInputUsdPerMillion,
          outputUsdPerMillion: pricing.premiumOutputUsdPerMillion,
        },
      ]
    : [];

  const reserveKeys = splitKeys(process.env.TRIPZY_AI_RESERVE_KEYS || process.env.TRIPZY_AI_GEMINI_KEYS || process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY);
  const reserveModel = cleanText(
    process.env.TRIPZY_AI_RESERVE_MODEL || process.env.TRIPZY_AI_GEMINI_MODEL || 'gemini-2.5-flash-lite',
    120
  );
  const reserveBaseUrl = cleanText(
    process.env.TRIPZY_AI_RESERVE_BASE_URL || process.env.TRIPZY_AI_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
    300
  );
  const reserveProviders = reserveKeys.map((apiKey, index) => ({
    slot: `reserve_${index + 1}`,
    tier: 'reserve',
    providerFamily: 'gemini',
    apiFormat: 'gemini',
    apiKey,
    baseUrl: reserveBaseUrl,
    model: reserveModel,
    timeoutMs: Math.max(timeoutMs, 3000),
    cooldownMs: Math.max(cooldownMs, 45000),
    inputUsdPerMillion: pricing.reserveInputUsdPerMillion,
    outputUsdPerMillion: pricing.reserveOutputUsdPerMillion,
  }));

  return [...standardProviders, ...premiumProviders, ...reserveProviders];
};

const readResponsePayload = async (response) => {
  const text = await response.text();

  try {
    return {
      rawText: text,
      json: JSON.parse(text),
    };
  } catch (_error) {
    return {
      rawText: text,
      json: null,
    };
  }
};

const buildFailureStatus = (statusCode) => {
  if (statusCode === 401 || statusCode === 403) return 'disabled';
  if (statusCode === 402 || statusCode === 429) return 'exhausted';
  return 'cooldown';
};

const getDateKey = () => new Date().toISOString().slice(0, 10);

const getDailyUsageBucket = (state, dateKey) => {
  const bucket = state.dailyUsage?.[dateKey] || {};
  return {
    date: dateKey,
    totalRequests: parseNumber(bucket.totalRequests, 0),
    successCount: parseNumber(bucket.successCount, 0),
    fallbackCount: parseNumber(bucket.fallbackCount, 0),
    totalInputTokens: parseNumber(bucket.totalInputTokens, 0),
    totalOutputTokens: parseNumber(bucket.totalOutputTokens, 0),
    totalCostUsd: parseNumber(bucket.totalCostUsd, 0),
    totalCostInr: parseNumber(bucket.totalCostInr, 0),
    premiumSuccesses: parseNumber(bucket.premiumSuccesses, 0),
    reserveSuccesses: parseNumber(bucket.reserveSuccesses, 0),
    providers: bucket.providers || {},
  };
};

const storeDailyUsageBucket = (state, bucket) => {
  state.dailyUsage = state.dailyUsage || {};
  state.dailyUsage[bucket.date] = bucket;
};

const ensureProviderUsage = (bucket, slot) => {
  bucket.providers[slot] = bucket.providers[slot] || {
    requests: 0,
    successes: 0,
    failures: 0,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    costInr: 0,
  };
  return bucket.providers[slot];
};

const buildCostEstimate = ({ provider, prompt, content }) => {
  const inputTokens = estimateTokenCount(prompt);
  const outputTokens = estimateTokenCount(content);
  const pricing = getPricingConfig();
  const usdToInr = pricing.usdToInr;
  const inputCostUsd = (inputTokens / 1_000_000) * provider.inputUsdPerMillion;
  const outputCostUsd = (outputTokens / 1_000_000) * provider.outputUsdPerMillion;
  const totalCostUsd = Number((inputCostUsd + outputCostUsd).toFixed(6));
  const totalCostInr = Number((totalCostUsd * usdToInr).toFixed(4));

  return {
    inputTokens,
    outputTokens,
    totalCostUsd,
    totalCostInr,
  };
};

const buildGeminiApiUrl = (provider) => {
  const base = cleanText(provider.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models', 300).replace(/\/+$/, '');
  return `${base}/${encodeURIComponent(provider.model)}:generateContent`;
};

const getGeminiContentText = (payload) => {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    const text = parts
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();

    if (text) {
      return text;
    }
  }

  return '';
};

const buildReserveEligibility = ({ primaryProviders, state, pricing, dailyUsage }) => {
  if (!primaryProviders.length) return true;

  return primaryProviders.every((provider) => {
    if (
      provider.tier === 'premium' &&
      (
        (pricing.premiumDailyBudgetInr > 0 && dailyUsage.totalCostInr >= pricing.premiumDailyBudgetInr) ||
        (pricing.premiumMaxCallsPerDay > 0 && dailyUsage.premiumSuccesses >= pricing.premiumMaxCallsPerDay)
      )
    ) {
      return true;
    }

    const status = state.providers?.[provider.slot]?.status || 'active';
    return status === 'exhausted' || status === 'disabled';
  });
};

export const createAiProviderPool = ({ stateFilePath }) => {
  const getProviders = () => buildProviderPool();
  const estimateProjectedCost = ({
    tripCount = 500,
    averageInputTokens = parseNumber(process.env.TRIPZY_ESTIMATE_INPUT_TOKENS, 2500),
    averageOutputTokens = parseNumber(process.env.TRIPZY_ESTIMATE_OUTPUT_TOKENS, 700),
    premiumFraction = parseNumber(process.env.TRIPZY_ESTIMATE_PREMIUM_FRACTION, 0.05),
  } = {}) => {
    const pricing = getPricingConfig();
    const standardTripUsd =
      (averageInputTokens / 1_000_000) * pricing.standardInputUsdPerMillion +
      (averageOutputTokens / 1_000_000) * pricing.standardOutputUsdPerMillion;
    const premiumTripUsd =
      (averageInputTokens / 1_000_000) * pricing.premiumInputUsdPerMillion +
      (averageOutputTokens / 1_000_000) * pricing.premiumOutputUsdPerMillion;
    const premiumTrips = Math.max(0, Math.min(tripCount, Math.round(tripCount * premiumFraction)));
    const standardTrips = Math.max(0, tripCount - premiumTrips);
    const totalCostUsd = Number(((standardTrips * standardTripUsd) + (premiumTrips * premiumTripUsd)).toFixed(6));
    const totalCostInr = Number((totalCostUsd * pricing.usdToInr).toFixed(2));
    const averageTripInr = tripCount ? Number((totalCostInr / tripCount).toFixed(4)) : 0;

    return {
      tripCount,
      standardTrips,
      premiumTrips,
      averageInputTokens,
      averageOutputTokens,
      premiumFraction,
      averageTripCostInr: averageTripInr,
      totalCostUsd,
      totalCostInr,
    };
  };

  const getUsageSummary = () => {
    const state = readState(stateFilePath);
    const today = getDailyUsageBucket(state, getDateKey());
    const pricing = getPricingConfig();

    return {
      today,
      dailyBudgetInr: pricing.dailyBudgetInr,
      premiumDailyBudgetInr: pricing.premiumDailyBudgetInr,
      premiumMaxCallsPerDay: pricing.premiumMaxCallsPerDay,
      reserveDailyBudgetInr: pricing.reserveDailyBudgetInr,
      reserveMaxCallsPerDay: pricing.reserveMaxCallsPerDay,
      usdToInr: pricing.usdToInr,
    };
  };

  const getProviderStateSummary = () => {
    const state = readState(stateFilePath);
    const today = getDailyUsageBucket(state, getDateKey());
    return getProviders().map((provider) => {
      const providerState = state.providers?.[provider.slot] || {};
      const providerUsage = today.providers?.[provider.slot] || {};
      return {
        slot: provider.slot,
        tier: provider.tier,
        model: provider.model,
        status: providerState.status || 'active',
        failures: parseNumber(providerState.failures, 0),
        cooldownUntil: providerState.cooldownUntil || null,
        lastError: providerState.lastError || '',
        lastAttemptAt: providerState.lastAttemptAt || null,
        lastSuccessAt: providerState.lastSuccessAt || null,
        lastHttpStatus: parseNumber(providerState.lastHttpStatus, 0),
        requestsToday: parseNumber(providerUsage.requests, 0),
        successesToday: parseNumber(providerUsage.successes, 0),
        estimatedCostInrToday: Number(parseNumber(providerUsage.costInr, 0).toFixed(4)),
      };
    });
  };

  const requestCompletion = async ({ prompt, maxTokens, temperature = 0.1 }) => {
    const providers = getProviders();

    if (!providers.length) {
      return {
        ok: false,
        useFallback: true,
        error: 'No AI providers are configured on the backend.',
        attempts: [],
      };
    }

    const state = readState(stateFilePath);
    const attempts = [];
    const now = Date.now();
    const dateKey = getDateKey();
    const dailyUsage = getDailyUsageBucket(state, dateKey);
    const pricing = getPricingConfig();
    const primaryProviders = providers.filter((provider) => provider.tier !== 'reserve');
    const reserveProviders = providers.filter((provider) => provider.tier === 'reserve');

    dailyUsage.totalRequests += 1;

    if (pricing.dailyBudgetInr > 0 && dailyUsage.totalCostInr >= pricing.dailyBudgetInr) {
      dailyUsage.fallbackCount += 1;
      storeDailyUsageBucket(state, dailyUsage);
      writeState(stateFilePath, state);
      return {
        ok: false,
        useFallback: true,
        error: 'Daily AI budget reached. Falling back to dataset mode.',
        attempts,
      };
    }

    const tryProvider = async (provider) => {
      if (
        provider.tier === 'premium' &&
        (
          (pricing.premiumDailyBudgetInr > 0 && dailyUsage.totalCostInr >= pricing.premiumDailyBudgetInr) ||
          (pricing.premiumMaxCallsPerDay > 0 && dailyUsage.premiumSuccesses >= pricing.premiumMaxCallsPerDay)
        )
      ) {
        attempts.push({
          slot: provider.slot,
          model: provider.model,
          skipped: true,
          reason: 'premium_budget_guard',
        });
        return null;
      }

      if (
        provider.tier === 'reserve' &&
        (
          (pricing.reserveDailyBudgetInr > 0 && dailyUsage.totalCostInr >= pricing.reserveDailyBudgetInr) ||
          (pricing.reserveMaxCallsPerDay > 0 && dailyUsage.reserveSuccesses >= pricing.reserveMaxCallsPerDay)
        )
      ) {
        attempts.push({
          slot: provider.slot,
          model: provider.model,
          skipped: true,
          reason: 'reserve_budget_guard',
        });
        return null;
      }

      const providerState = state.providers?.[provider.slot] || {};
      const cooldownUntil = providerState.cooldownUntil ? new Date(providerState.cooldownUntil).getTime() : 0;

      if (cooldownUntil > now) {
        attempts.push({
          slot: provider.slot,
          model: provider.model,
          skipped: true,
          reason: 'cooldown',
        });
        return null;
      }

      state.providers[provider.slot] = {
        ...providerState,
        status: 'active',
        lastAttemptAt: new Date().toISOString(),
      };
      ensureProviderUsage(dailyUsage, provider.slot).requests += 1;
      storeDailyUsageBucket(state, dailyUsage);
      writeState(stateFilePath, state);

      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), provider.timeoutMs);

      try {
        const response = await fetch(
          provider.apiFormat === 'gemini' ? buildGeminiApiUrl(provider) : provider.baseUrl,
          {
            method: 'POST',
            headers:
              provider.apiFormat === 'gemini'
                ? {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': provider.apiKey,
                  }
                : {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${provider.apiKey}`,
                  },
            signal: controller.signal,
            body: JSON.stringify(
              provider.apiFormat === 'gemini'
                ? {
                    systemInstruction: {
                      parts: [
                        {
                          text: 'You are a travel itinerary generator. Return valid JSON only. Never use markdown fences.',
                        },
                      ],
                    },
                    contents: [
                      {
                        role: 'user',
                        parts: [
                          {
                            text: prompt,
                          },
                        ],
                      },
                    ],
                    generationConfig: {
                      temperature,
                      maxOutputTokens: maxTokens,
                      responseMimeType: 'application/json',
                    },
                  }
                : {
                    model: provider.model,
                    temperature,
                    max_tokens: maxTokens,
                    response_format: { type: 'json_object' },
                    messages: [
                      {
                        role: 'system',
                        content: 'You are a travel itinerary generator. Return valid JSON only. Never use markdown fences.',
                      },
                      {
                        role: 'user',
                        content: prompt,
                      },
                    ],
                  }
            ),
          }
        );

        clearTimeout(timeoutHandle);
        const payload = await readResponsePayload(response);

        if (!response.ok) {
          const failureStatus = buildFailureStatus(response.status);
          const nextCooldown =
            failureStatus === 'disabled'
              ? null
              : new Date(Date.now() + provider.cooldownMs).toISOString();

          state.providers[provider.slot] = {
            ...state.providers[provider.slot],
            status: failureStatus,
            failures: parseNumber(state.providers[provider.slot]?.failures, 0) + 1,
            cooldownUntil: nextCooldown,
            lastHttpStatus: response.status,
            lastError: cleanText(payload.json?.error?.message || payload.rawText || `HTTP ${response.status}`, 240),
          };
          ensureProviderUsage(dailyUsage, provider.slot).failures += 1;
          storeDailyUsageBucket(state, dailyUsage);
          writeState(stateFilePath, state);

          attempts.push({
            slot: provider.slot,
            model: provider.model,
            statusCode: response.status,
            error: state.providers[provider.slot].lastError,
          });
          return null;
        }

        const content =
          provider.apiFormat === 'gemini'
            ? getGeminiContentText(payload.json)
            : payload.json?.choices?.[0]?.message?.content || '';
        if (!content) {
          state.providers[provider.slot] = {
            ...state.providers[provider.slot],
            status: 'cooldown',
            failures: parseNumber(state.providers[provider.slot]?.failures, 0) + 1,
            cooldownUntil: new Date(Date.now() + provider.cooldownMs).toISOString(),
            lastHttpStatus: response.status,
            lastError: 'Provider returned an empty completion.',
          };
          ensureProviderUsage(dailyUsage, provider.slot).failures += 1;
          storeDailyUsageBucket(state, dailyUsage);
          writeState(stateFilePath, state);
          attempts.push({
            slot: provider.slot,
            model: provider.model,
            statusCode: response.status,
            error: 'Provider returned an empty completion.',
          });
          return null;
        }

        const costEstimate = buildCostEstimate({ provider, prompt, content });
        const providerUsage = ensureProviderUsage(dailyUsage, provider.slot);

        providerUsage.successes += 1;
        providerUsage.inputTokens += costEstimate.inputTokens;
        providerUsage.outputTokens += costEstimate.outputTokens;
        providerUsage.costUsd = Number((providerUsage.costUsd + costEstimate.totalCostUsd).toFixed(6));
        providerUsage.costInr = Number((providerUsage.costInr + costEstimate.totalCostInr).toFixed(4));
        dailyUsage.successCount += 1;
        dailyUsage.totalInputTokens += costEstimate.inputTokens;
        dailyUsage.totalOutputTokens += costEstimate.outputTokens;
        dailyUsage.totalCostUsd = Number((dailyUsage.totalCostUsd + costEstimate.totalCostUsd).toFixed(6));
        dailyUsage.totalCostInr = Number((dailyUsage.totalCostInr + costEstimate.totalCostInr).toFixed(4));
        if (provider.tier === 'premium') {
          dailyUsage.premiumSuccesses += 1;
        }
        if (provider.tier === 'reserve') {
          dailyUsage.reserveSuccesses += 1;
        }

        state.providers[provider.slot] = {
          ...state.providers[provider.slot],
          status: 'active',
          failures: 0,
          cooldownUntil: null,
          lastHttpStatus: response.status,
          lastError: '',
          lastSuccessAt: new Date().toISOString(),
        };
        storeDailyUsageBucket(state, dailyUsage);
        writeState(stateFilePath, state);

        return {
          ok: true,
          content,
          generation: {
            providerName: provider.model,
            providerSlot: provider.slot,
            wasFallbackUsed: false,
            estimatedInputTokens: costEstimate.inputTokens,
            estimatedOutputTokens: costEstimate.outputTokens,
            estimatedCostUsd: costEstimate.totalCostUsd,
            estimatedCostInr: costEstimate.totalCostInr,
          },
          attempts,
        };
      } catch (error) {
        clearTimeout(timeoutHandle);
        const isAbort = error?.name === 'AbortError';
        state.providers[provider.slot] = {
          ...state.providers[provider.slot],
          status: 'cooldown',
          failures: parseNumber(state.providers[provider.slot]?.failures, 0) + 1,
          cooldownUntil: new Date(Date.now() + provider.cooldownMs).toISOString(),
          lastHttpStatus: 0,
          lastError: cleanText(isAbort ? 'Provider request timed out.' : error?.message || 'Network error', 240),
        };
        ensureProviderUsage(dailyUsage, provider.slot).failures += 1;
        storeDailyUsageBucket(state, dailyUsage);
        writeState(stateFilePath, state);

        attempts.push({
          slot: provider.slot,
          model: provider.model,
          statusCode: 0,
          error: state.providers[provider.slot].lastError,
        });
        return null;
      }
    };

    for (const provider of primaryProviders) {
      const result = await tryProvider(provider);
      if (result) {
        return result;
      }
    }

    const isReserveEligible = buildReserveEligibility({
      primaryProviders,
      state,
      pricing,
      dailyUsage,
    });

    if (isReserveEligible) {
      for (const provider of reserveProviders) {
        const result = await tryProvider(provider);
        if (result) {
          return result;
        }
      }
    }

    dailyUsage.fallbackCount += 1;
    storeDailyUsageBucket(state, dailyUsage);
    writeState(stateFilePath, state);

    return {
      ok: false,
      useFallback: true,
      error: isReserveEligible
        ? 'All configured AI providers failed, cooled down, or were blocked by cost guards.'
        : 'Groq providers are still reserved as the primary tier. Gemini reserve keys will only activate after every Groq key is fully exhausted or blocked by quota guards.',
      attempts,
    };
  };

  return {
    estimateProjectedCost,
    getProviderStateSummary,
    getUsageSummary,
    requestCompletion,
  };
};
