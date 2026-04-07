"use strict";
// ============================================================
// CS Quill 🦔 — Cost Tracker
// ============================================================
// API 호출 비용 실시간 추적.
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackCost = trackCost;
exports.estimateCost = estimateCost;
exports.getTodayCost = getTodayCost;
exports.getWeeklyCost = getWeeklyCost;
exports.formatCostSummary = formatCostSummary;
const fs_1 = require("fs");
const path_1 = require("path");
const config_1 = require("./config");
// Pricing per 1K tokens (approximate, 2026)
const PRICING = {
    'claude-opus-4-6': { input: 0.015, output: 0.075 },
    'claude-sonnet-4-6': { input: 0.003, output: 0.015 },
    'claude-haiku-4-5': { input: 0.0008, output: 0.004 },
    'gpt-5.4': { input: 0.01, output: 0.03 },
    'gpt-5.4-mini': { input: 0.0004, output: 0.0016 },
    'gemini-2.5-pro': { input: 0.00125, output: 0.005 },
    'gemini-2.5-flash': { input: 0.0001, output: 0.0004 },
    'llama-3.3-70b': { input: 0, output: 0 },
    'llama3': { input: 0, output: 0 },
};
// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=CostEntry,DailyCost
// ============================================================
// PART 2 — Storage
// ============================================================
function getCostPath() {
    return (0, path_1.join)((0, config_1.getGlobalConfigDir)(), 'costs.json');
}
function loadCosts() {
    const path = getCostPath();
    if (!(0, fs_1.existsSync)(path))
        return [];
    try {
        return JSON.parse((0, fs_1.readFileSync)(path, 'utf-8'));
    }
    catch {
        return [];
    }
}
function saveCosts(entries) {
    (0, fs_1.mkdirSync)((0, config_1.getGlobalConfigDir)(), { recursive: true });
    // Keep last 30 days
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = entries.filter(e => e.timestamp > cutoff);
    (0, fs_1.writeFileSync)(getCostPath(), JSON.stringify(recent, null, 2));
}
// IDENTITY_SEAL: PART-2 | role=storage | inputs=none | outputs=CostEntry[]
// ============================================================
// PART 3 — Track & Query
// ============================================================
function trackCost(provider, model, task, inputTokens, outputTokens) {
    const pricing = PRICING[model] ?? { input: 0.001, output: 0.005 };
    const costUsd = (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
    const entry = { timestamp: Date.now(), provider, model, task, inputTokens, outputTokens, costUsd };
    const costs = loadCosts();
    costs.push(entry);
    saveCosts(costs);
    return entry;
}
function estimateCost(model, inputTokens, outputTokens) {
    const pricing = PRICING[model] ?? { input: 0.001, output: 0.005 };
    return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}
function getTodayCost() {
    const today = new Date().toISOString().slice(0, 10);
    const costs = loadCosts().filter(e => new Date(e.timestamp).toISOString().slice(0, 10) === today);
    const byProvider = {};
    const byTask = {};
    for (const c of costs) {
        byProvider[c.provider] = (byProvider[c.provider] ?? 0) + c.costUsd;
        byTask[c.task] = (byTask[c.task] ?? 0) + c.costUsd;
    }
    return {
        date: today,
        totalUsd: costs.reduce((s, c) => s + c.costUsd, 0),
        entries: costs.length,
        byProvider,
        byTask,
    };
}
function getWeeklyCost() {
    const costs = loadCosts();
    const days = new Map();
    for (const c of costs) {
        const date = new Date(c.timestamp).toISOString().slice(0, 10);
        const day = days.get(date) ?? [];
        day.push(c);
        days.set(date, day);
    }
    return [...days.entries()].map(([date, entries]) => ({
        date,
        totalUsd: entries.reduce((s, c) => s + c.costUsd, 0),
        entries: entries.length,
        byProvider: {},
        byTask: {},
    })).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
}
function formatCostSummary() {
    const today = getTodayCost();
    const lines = [
        `  💰 오늘 비용: $${today.totalUsd.toFixed(4)} (${today.entries}회 호출)`,
    ];
    if (Object.keys(today.byProvider).length > 0) {
        for (const [p, cost] of Object.entries(today.byProvider)) {
            lines.push(`     ${p}: $${cost.toFixed(4)}`);
        }
    }
    return lines.join('\n');
}
// IDENTITY_SEAL: PART-3 | role=track-query | inputs=provider,model,task,tokens | outputs=CostEntry
