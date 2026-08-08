/**
 * RiskLens AI - Real-time Application & DevOps Metrics Collector
 * 
 * Tracks:
 * - Process uptime and resource utilization (RSS, Heap, CPU)
 * - Request throughput, active requests, and status code distributions
 * - Response latency percentiles and averages
 * - Multi-agent and ML model execution counters
 * - Prometheus-compatible and JSON export format
 */

export interface SystemMetrics {
  uptimeSeconds: number;
  nodeVersion: string;
  pid: number;
  memory: {
    rssMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
    externalMb: number;
  };
  cpu: {
    userMicros: number;
    systemMicros: number;
  };
}

export interface HttpMetrics {
  totalRequests: number;
  activeRequests: number;
  statusCodes: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
  };
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export interface BusinessMetrics {
  transactionsIngested: number;
  investigationsCompleted: number;
  copilotQueriesProcessed: number;
  actionsResolved: number;
  fraudDetectedCount: number;
}

export class MetricsRegistry {
  private static instance: MetricsRegistry | null = null;
  private startTime = Date.now();
  private totalRequests = 0;
  private activeRequests = 0;
  private statusCodes = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
  private latencies: number[] = [];
  private readonly maxLatencyHistory = 500;

  private business = {
    transactionsIngested: 0,
    investigationsCompleted: 0,
    copilotQueriesProcessed: 0,
    actionsResolved: 0,
    fraudDetectedCount: 0,
  };

  public static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }

  public recordRequestStart(): () => void {
    this.totalRequests++;
    this.activeRequests++;
    const start = Date.now();

    return () => {
      this.activeRequests = Math.max(0, this.activeRequests - 1);
      const duration = Date.now() - start;
      this.latencies.push(duration);
      if (this.latencies.length > this.maxLatencyHistory) {
        this.latencies.shift();
      }
    };
  }

  public recordStatusCode(code: number): void {
    if (code >= 200 && code < 300) this.statusCodes['2xx']++;
    else if (code >= 300 && code < 400) this.statusCodes['3xx']++;
    else if (code >= 400 && code < 500) this.statusCodes['4xx']++;
    else if (code >= 500) this.statusCodes['5xx']++;
  }

  public recordTransactionIngest(count = 1): void {
    this.business.transactionsIngested += count;
  }

  public recordInvestigation(): void {
    this.business.investigationsCompleted++;
  }

  public recordCopilotQuery(): void {
    this.business.copilotQueriesProcessed++;
  }

  public recordActionResolution(): void {
    this.business.actionsResolved++;
  }

  public recordFraudDetected(): void {
    this.business.fraudDetectedCount++;
  }

  public getSystemMetrics(): SystemMetrics {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();

    return {
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      nodeVersion: process.version,
      pid: process.pid,
      memory: {
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        externalMb: Math.round((mem.external / 1024 / 1024) * 100) / 100,
      },
      cpu: {
        userMicros: cpu.user,
        systemMicros: cpu.system,
      },
    };
  }

  public getHttpMetrics(): HttpMetrics {
    const sum = this.latencies.reduce((acc, val) => acc + val, 0);
    const avg = this.latencies.length > 0 ? Math.round((sum / this.latencies.length) * 10) / 10 : 0;

    let p95 = 0;
    if (this.latencies.length > 0) {
      const sorted = [...this.latencies].sort((a, b) => a - b);
      const index = Math.floor(sorted.length * 0.95);
      p95 = sorted[Math.min(index, sorted.length - 1)];
    }

    return {
      totalRequests: this.totalRequests,
      activeRequests: this.activeRequests,
      statusCodes: { ...this.statusCodes },
      avgLatencyMs: avg,
      p95LatencyMs: p95,
    };
  }

  public getBusinessMetrics(): BusinessMetrics {
    return { ...this.business };
  }

  public getFullMetrics() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      system: this.getSystemMetrics(),
      http: this.getHttpMetrics(),
      business: this.getBusinessMetrics(),
    };
  }

  public toPrometheusFormat(): string {
    const sys = this.getSystemMetrics();
    const http = this.getHttpMetrics();
    const biz = this.getBusinessMetrics();

    return [
      '# HELP risklens_process_uptime_seconds Total application uptime in seconds',
      '# TYPE risklens_process_uptime_seconds gauge',
      `risklens_process_uptime_seconds ${sys.uptimeSeconds}`,
      '# HELP risklens_memory_heap_used_bytes Process heap memory used in bytes',
      '# TYPE risklens_memory_heap_used_bytes gauge',
      `risklens_memory_heap_used_bytes ${Math.round(sys.memory.heapUsedMb * 1024 * 1024)}`,
      '# HELP risklens_http_requests_total Total HTTP requests served',
      '# TYPE risklens_http_requests_total counter',
      `risklens_http_requests_total ${http.totalRequests}`,
      '# HELP risklens_http_requests_active Current active in-flight requests',
      '# TYPE risklens_http_requests_active gauge',
      `risklens_http_requests_active ${http.activeRequests}`,
      '# HELP risklens_http_latency_average_ms Average response latency in ms',
      '# TYPE risklens_http_latency_average_ms gauge',
      `risklens_http_latency_average_ms ${http.avgLatencyMs}`,
      '# HELP risklens_investigations_total Total multi-agent investigations executed',
      '# TYPE risklens_investigations_total counter',
      `risklens_investigations_total ${biz.investigationsCompleted}`,
      '# HELP risklens_transactions_ingested_total Total transactions processed through ML engine',
      '# TYPE risklens_transactions_ingested_total counter',
      `risklens_transactions_ingested_total ${biz.transactionsIngested}`,
    ].join('\n') + '\n';
  }
}

export const metrics = MetricsRegistry.getInstance();
