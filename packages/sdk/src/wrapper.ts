import { VoltAgentClient } from "./client";
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

export class VoltAgentHistoryWrapper {
  private coreClient: VoltAgentClient;
  private historyData: History;

  constructor(coreClient: VoltAgentClient, historyData: History) {
    this.coreClient = coreClient;
    this.historyData = historyData;
  }

  /**
   * History'yi günceller
   */
  async update(data: Omit<UpdateHistoryRequest, "id">): Promise<History> {
    const updatedHistory = await this.coreClient.updateHistory({
      id: this.historyData.id,
      ...data,
    });

    // Internal state'i güncelle
    this.historyData = updatedHistory;
    return updatedHistory;
  }

  /**
   * History'yi sonlandırır (status ve endTime setler, diğer alanları da güncelleyebilir)
   */
  async end(data?: Omit<UpdateHistoryRequest, "id">): Promise<History> {
    return this.update({
      status: "completed",
      endTime: new Date().toISOString(),
      ...data, // kullanıcının verdiği data ile override edilebilir
    });
  }

  /**
   * History'ye event ekler - traceId'yi otomatik olarak historyId olarak ayarlar
   */
  async addEvent(event: TimelineEventInput): Promise<Event> {
    // traceId'yi historyId olarak set et ve diğer eksik alanları doldur
    const eventWithTraceId: TimelineEventCore = {
      id: randomUUID(), // ID oluştur
      startTime: new Date().toISOString(), // Default startTime
      ...event,
      traceId: this.historyData.id,
    } as unknown as TimelineEventCore;

    return this.coreClient.addEvent({
      historyId: this.historyData.id,
      event: eventWithTraceId,
    });
  }

  /**
   * Mevcut history verisini döndürür
   */
  get data(): History {
    return this.historyData;
  }

  /**
   * History ID'sini döndürür
   */
  get id(): string {
    return this.historyData.id;
  }
}

export class VoltAgentSDK {
  private coreClient: VoltAgentClient;
  private eventQueue: Array<{ historyId: string; event: TimelineEventCore }> = [];
  private autoFlushInterval?: NodeJS.Timeout;

  constructor(
    options: VoltAgentClientOptions & {
      autoFlush?: boolean;
      flushInterval?: number;
    },
  ) {
    this.coreClient = new VoltAgentClient(options);

    // Auto flush özelliği
    if (options.autoFlush !== false) {
      const interval = options.flushInterval || 5000; // 5 saniye default
      this.autoFlushInterval = setInterval(() => {
        this.flush();
      }, interval);
    }
  }

  /**
   * Yeni bir history oluşturur ve wrapper döndürür
   */
  async createHistory(data: CreateHistoryRequest): Promise<VoltAgentHistoryWrapper> {
    const history = await this.coreClient.addHistory(data);
    return new VoltAgentHistoryWrapper(this.coreClient, history);
  }

  /**
   * Direkt history oluşturur (wrapper olmadan)
   */
  async addHistory(data: CreateHistoryRequest): Promise<History> {
    return this.coreClient.addHistory(data);
  }

  /**
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
  get client(): VoltAgentClient {
    return this.coreClient;
  }
}
