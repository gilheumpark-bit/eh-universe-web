import { runAutonomousFactory } from './renderer/lib/code-studio/pipeline/master-autopilot';
import * as perf_hooks from 'perf_hooks';

async function performLoadTest() {
  console.log("=== [Panopticon V2.1] Load & Payload Test Flight ===\n");
  
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = perf_hooks.performance.now();

  // 대량의 가상 스캔 처리 시뮬레이션
  console.log("[TEST] Triggering 10 batches of AST chunking & escalation validation...");
  for(let i=0; i< 10; i++) {
     process.stdout.write(`Batch ${i+1}/10... `);
     const result = await runAutonomousFactory(`./fake_dir_batch_${i}`);
     console.log(`Result: ${result}`);
  }

  const endMemory = process.memoryUsage().heapUsed;
  const endTime = perf_hooks.performance.now();

  console.log("\n[TEST COMPLETED]");
  console.log(`[METRICS] Total Time Taken : ${(endTime - startTime).toFixed(2)} ms`);
  console.log(`[METRICS] Memory Delta     : ${Math.round((endMemory - startMemory) / 1024 / 1024)} MB`);
  
  if (endTime - startTime > 10000) {
      console.warn("[CHECK] Pipeline takes too long. Payload optimization and aggressive GC might be needed.\n");
  } else {
      console.log("[SUCCESS] Pipeline operates within safe boundaries for current load test.\n");
  }
}

performLoadTest().catch(console.error);
