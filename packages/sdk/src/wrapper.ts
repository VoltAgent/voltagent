import { VoltAgentCoreAPI } from "./client";
import type {
  VoltAgentClientOptions,
  CreateHistoryRequest,
  UpdateHistoryRequest,
  History,
  TimelineEventCore,
  TimelineEventInput,
  Event,
} from "./types";
import { randomUUID } from "node:crypto";

export class VoltAgentObservabilitySDK {
  private coreClient: VoltAgentCoreAPI;
  private eventQueue: Array<{ historyId: string; event: TimelineEventCore }> = [];
  private autoFlushInterval?: NodeJS.Timeout;
  private histories = new Map<string, History>(); // History state tracking

  constructor(
    options: VoltAgentClientOptions & {
      autoFlush?: boolean;
      flushInterval?: number;
    },
  ) {
    this.coreClient = new VoltAgentCoreAPI(options);

    // Auto flush özelliği
    if (options.autoFlush !== false) {
      const interval = options.flushInterval || 5000; // 5 saniye default
      this.autoFlushInterval = setInterval(() => {
        this.flush();
      }, interval);
    }
  }

  /**
   * Yeni bir history oluşturur
   */
  async createHistory(data: CreateHistoryRequest): Promise<History> {
    const history = await this.coreClient.addHistory(data);
    // History'yi internal state'e kaydet
    this.histories.set(history.id, history);
    return history;
  }

  /**
   * Var olan bir history'yi günceller
   */
  async updateHistory(historyId: string, data: Omit<UpdateHistoryRequest, "id">): Promise<History> {
    const updatedHistory = await this.coreClient.updateHistory({
      id: historyId,
      ...data,
    });

    // Internal state'i güncelle
    this.histories.set(historyId, updatedHistory);
    return updatedHistory;
  }

  /**
   * History'yi sonlandırır (status ve endTime setler, diğer alanları da güncelleyebilir)
   */
  async endHistory(historyId: string, data?: Omit<UpdateHistoryRequest, "id">): Promise<History> {
    return this.updateHistory(historyId, {
      status: "completed",
      endTime: new Date().toISOString(),
      ...data, // kullanıcının verdiği data ile override edilebilir
    });
  }

  /**
   * Type-safe event ekleme - discriminated union ile tam tip güvenliği
   * History'ye event ekler - traceId'yi otomatik olarak historyId olarak ayarlar
   */
  async addEventToHistory(historyId: string, event: TimelineEventInput): Promise<Event> {
    // traceId'yi historyId olarak set et ve diğer eksik alanları doldur
    const eventWithTraceId: TimelineEventCore = {
      id: randomUUID(), // ID oluştur
      startTime: new Date().toISOString(), // Default startTime
      ...event,
      traceId: historyId,
    } as unknown as TimelineEventCore;

    return this.coreClient.addEvent({
      historyId,
      event: eventWithTraceId,
    });
  }

  /**
   * Mevcut history verisini döndürür
   */
  getHistory(historyId: string): History | undefined {
    return this.histories.get(historyId);
  }

  /**
   * Type-safe event kuyruğa ekleme
   * Event'i kuyruğa ekler (batch için) - traceId'yi otomatik olarak historyId olarak ayarlar
   */
  queueEvent(historyId: string, event: TimelineEventInput): void {
    const eventWithTraceId: TimelineEventCore = {
      id: randomUUID(), // ID oluştur
      startTime: new Date().toISOString(), // Default startTime
      ...event,
      traceId: historyId,
    } as unknown as TimelineEventCore;

    this.eventQueue.push({ historyId, event: eventWithTraceId });
  }

  /**
   * Kuyrukta bekleyen tüm event'leri gönderir
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    // History ID'ye göre grupla
    const groupedEvents = this.eventQueue.reduce(
      (acc, item) => {
        if (!acc[item.historyId]) {
          acc[item.historyId] = [];
        }
        acc[item.historyId].push(item.event);
        return acc;
      },
      {} as Record<string, TimelineEventCore[]>,
    );

    // Her history için event'leri gönder
    const promises = Object.entries(groupedEvents).map(async ([historyId, events]) => {
      // Tek tek gönder (batch endpoint yoksa)
      return Promise.all(events.map((event) => this.coreClient.addEvent({ historyId, event })));
    });

    await Promise.all(promises);

    // Kuyruğu temizle
    this.eventQueue = [];
  }

  /**
   * SDK'yı kapat ve bekleyen event'leri gönder
   */
  async shutdown(): Promise<void> {
    if (this.autoFlushInterval) {
      clearInterval(this.autoFlushInterval);
    }

    await this.flush();
  }

  /**
   * Core client'a direkt erişim (advanced kullanım için)
   */
  get client(): VoltAgentCoreAPI {
    return this.coreClient;
  }
}
