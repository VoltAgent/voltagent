# Telemetri Servisi Entegrasyonu: Supabase Vault ve Edge Fonksiyonları ile

Bu plan, Voltagent agent geçmiş verilerinin ve agent durum anlık görüntülerinin, Supabase Vault'ta güvenli bir şekilde saklanan API anahtarları ile doğrulama yapan Supabase Edge Fonksiyonları aracılığıyla kaydedilmesini amaçlamaktadır. Bu, hem güvenliği artırır hem de verilerin merkezi bir yerde toplanmasını sağlar.

## Mimarinin Ana Hatları

1.  **API Anahtar Yönetimi (Supabase Vault):**

    - Her bir "Proje" için benzersiz bir `public_key` (istemci tarafında bilinir) ve buna karşılık gelen bir `api_secret_key` (sadece sunucu tarafında bilinir ve Vault'ta saklanır) olacaktır.
    - `projects` tablosunda sadece `public_key` sütunu bulunacaktır.
    - `api_secret_key`, Supabase Vault'ta `projects/<public_key>/api_secret` gibi bir yolda saklanacaktır.

2.  **Veri Yazma İşlemleri (Supabase Edge Fonksiyonları):**
    - `agent_history_entries` ve `timeline_events` tablolarına veri yazma işlemleri, özel Supabase Edge Fonksiyonları aracılığıyla yapılacaktır.
    - İstemci (`TelemetryServiceApiClient`), istekle birlikte `publicKey` ve kullanıcının girdiği `clientSecretKey`'i Edge Fonksiyonuna gönderecektir.
    - Edge Fonksiyonu, `publicKey` kullanarak Vault'tan gerçek `api_secret_key`'i alacak, istemciden gelen `clientSecretKey` ile karşılaştıracak ve eşleşme durumunda `service_role` yetkisiyle veritabanına yazma işlemini gerçekleştirecektir.

## Adımlar

1.  **Supabase Proje ve Veritabanı Yapılandırması:**

    - Mevcut Supabase projesinin kullanıldığını varsayıyoruz.
    - **`projects` Tablosu Güncellemesi:**
      - [x] `projects` tablosunda `public_key TEXT UNIQUE NOT NULL` sütununun olduğundan emin olun (örn: `20250509014406_projects_keys.sql` ile eklendi).
      - [x] `projects` tablosunda `secret_key` veya `secret_key_hash` gibi sütunların olmadığından emin olun (örn: `20250509014426_projects_keys_delete.sql` ile kaldırıldı).
    - **`agent_history_entries` Tablosu:**
      - [x] Şeması `plan.md`'de tanımlandığı gibi oluşturulmuş olmalı (`20250509192437_agent_history_entries.sql`).
      - RLS: Doğrudan `INSERT` yetkisi olmamalıdır. `SELECT` yetkisi "account members" için tanımlanmalıdır.
    - **`timeline_events` Tablosu:**
      - [x] Şeması `plan.md`'de tanımlandığı gibi oluşturulmuş olmalı (`20250509194256_timeline_events.sql`).
      - RLS: Doğrudan `INSERT` yetkisi olmamalıdır. `SELECT` yetkisi "account members" için tanımlanmalıdır.
    - **RPC Fonksiyonları Temizliği:**
      - [x] Daha önce oluşturulan `..._rpc.sql` uzantılı migrasyon dosyaları silinmiştir.

2.  **Supabase Vault Yapılandırması ve Anahtar Yönetimi:**

    - **Proje Oluşturma Sırasında Anahtar Yönetimi (Artık `create-project-and-keys` Edge Fonksiyonu ile):**
      - Yeni bir proje oluşturma isteği UI tarafından `create-project-and-keys` Edge Fonksiyonuna yapılır.
      - Bu Edge Fonksiyonu şunlardan sorumludur:
        - `projects` tablosuna kayıt eklemek ve `public_key`'i (veritabanı tarafından `DEFAULT` ile) otomatik olarak oluşturmak.
        - Güçlü ve benzersiz bir `api_secret_key` üretmek.
        - Üretilen ham (raw) `api_secret_key`'i, Supabase Vault'ta `projects/<public_key_degeri>/api_secret` gibi bir yolda güvenli bir şekilde saklamak.
        - UI'a, `project_id`, `public_key` ile birlikte **oluşturulan ham `api_secret_key`'i bir kerelik göstermek/döndürmek.**
        - Kullanıcı bu ham `api_secret_key`'i kopyalayıp güvenli bir yerde saklamaktan sorumludur.
    - **Kullanım:**
      - Kullanıcı, `VoltAgentExporter`'ı yapılandırırken, proje oluşturma sırasında aldığı bu ham `api_secret_key`'i, `secretKey` (veya Edge Fonksiyonu bağlamında `clientSecretKey`) parametresi olarak kullanacaktır.

3.  **Supabase Edge Fonksiyonlarının Geliştirilmesi:**

    - **`create-project-and-keys` Edge Fonksiyonu:**
      - Giriş: `{ accountId: string, projectName: string, ...diğer proje bilgileri }` (UI'dan gelen istek).
      - İşlev:
        1.  Gerekli doğrulamaları yap (örn: kullanıcının `accountId` için proje oluşturma yetkisi var mı?).
        2.  Yeni bir `api_secret_key` (ham değer) üret.
        3.  `service_role` yetkisiyle Supabase client'ını kullanarak `projects` tablosuna kayıt ekle (`public_key` DB tarafından otomatik üretilir). Oluşturulan `project_id` ve `public_key`'i al.
        4.  `public_key`'den Vault için benzersiz bir `secret_name` (örn: `project_api_secret_${public_key}`) ve bir `description` oluştur.
        5.  `service_role` yetkisiyle Supabase client'ını kullanarak, `vault.create_secret`'ı çağıran `public.create_project_secret_in_vault` (veya benzer isimlendirilmiş) public SQL fonksiyonunu RPC aracılığıyla çağırarak üretilen ham `api_secret_key`'i Vault'a kaydet.
        6.  Başarılı yanıt olarak UI'a `project_id`, `public_key` ve ham `api_secret_key`'i (bir kerelik gösterim için) döndür.
    - **`export-agent-history` Edge Fonksiyonu:**
      - Giriş: `{ publicKey: string, clientSecretKey: string, payload: AgentHistoryEntryData }`
      - İşlev:
        1.  `publicKey` kullanarak `vault.decrypted_secrets` view'ından veya ilişkili bir SQL fonksiyonu aracılığıyla Vault'tan `stored_api_secret`'ı al. (Vault'taki secret adı, `publicKey`'e dayalı olarak belirlenir, örn: `project_api_secret_${publicKey}`).
        2.  İstemciden gelen `clientSecretKey` ile Vault'tan alınan `stored_api_secret`'ı karşılaştır.
        3.  Başarılıysa, `payload` içindeki verileri (ve `publicKey` ile `projects` tablosundan bulunan `project_id`, `account_id`'yi) kullanarak `agent_history_entries` tablosuna `service_role` ile kayıt ekle.
        4.  Yeni kaydın ID'sini veya başarı/hata durumunu döndür.
    - **`export-timeline-event` Edge Fonksiyonu:**
      - Giriş: `{ publicKey: string, clientSecretKey: string, payload: TimelineEventData }` (payload `history_entry_id` içermeli)
      - İşlev:
        1.  `publicKey` ve `clientSecretKey` doğrulaması yap (yukarıdaki `export-agent-history` fonksiyonundaki gibi Vault'tan okuyarak).
        2.  Başarılıysa, `payload` içindeki verileri (ve `publicKey` ile bulunan `project_id`, `account_id` ve `payload.history_entry_id`'nin bu projeye ait olduğunun kontrolü) kullanarak `timeline_events` tablosuna `service_role` ile kayıt ekle.
        3.  Yeni kaydın ID'sini veya başarı/hata durumunu döndür.
    - Edge Fonksiyonları Deno (TypeScript) ile yazılacaktır. `supabase-js` client'ı `service_role` anahtarıyla kullanılacaktır.

4.  **`VoltAgentExporter` ve `TelemetryServiceApiClient` Güncellemeleri:**

    - **`VoltAgentExporterOptions` Arayüzü:**
      - `rpcUrl` yerine `baseUrl: string` (örn: `https://<id>.supabase.co/functions/v1`) alacak.
      - `publicKey: string` ve `secretKey: string` (bu, istemcinin sağlayacağı `clientSecretKey` olacak) alanları kalacak.
      - `supabaseAnonKey` opsiyonel olarak kalabilir (Edge Function'a anonim çağrı yapılıyorsa).
    - **`TelemetryServiceApiClient` Sınıfı/Modülü:**
      - Bu katman, `VoltAgentExporter`'dan aldığı yapılandırma ile `fetch` API'sini kullanarak yukarıda tanımlanan Edge Fonksiyonlarına (`baseUrl + '/export-agent-history'`, `baseUrl + '/export-timeline-event'`) `POST` istekleri yapacaktır.
      - İstek gövdesi `{ publicKey, clientSecretKey, payload }` formatında olacaktır.
      - Gerekli `Authorization: Bearer <supabase_anon_key>` ve `Content-Type: application/json` başlıklarını ekleyecektir.
    - **`exportHistorySteps` metodları:**
      - [x] `TelemetryServiceApiClient'a exportHistorySteps metodu eklenecek.`
      - [x] `VoltAgentExporter'a exportHistorySteps metodu eklenecek.`
      - [x] `TelemetryServiceApiClient'a updateAgentHistory metodu eklenecek.`
      - [x] `VoltAgentExporter'a updateHistoryEntry metodu eklenecek.`

5.  **`HistoryManager`, `VoltAgent`, `Agent` Sınıfı Güncellemeleri:**

    - **`HistoryManager` constructor'ı:**
      - [x] `TelemetryServiceApiClient`'ı (veya `VoltAgentExporter`'ı) alacak.
    - **`addEntry` metodu:**
      - [x] `agent_snapshot` dahil verileri `TelemetryServiceApiClient` aracılığıyla `export-agent-history` Edge Fonksiyonuna gönderecek.
    - **`addEventToEntry` metodu:**
      - [x] verileri `TelemetryServiceApiClient` aracılığıyla `export-timeline-event` Edge Fonksiyonuna gönderecek.
    - **`addStepsToEntry` metodu:**
      - [x] `export-history-steps` Edge Fonksiyonunu çağıracak.
    - **Diğer `HistoryManager` metodları:**
      - [ ] Diğer `HistoryManager` metodları için telemetri stratejisi belirlenecek.
    - **`VoltAgent` ve `Agent` sınıfları:**
      - [x] `telemetryExporter` ve `agent_snapshot` mantığını planlandığı gibi yönetecek.

6.  **Güvenlik ve Yapılandırma:**

    - Supabase Vault'taki `api_secret_key`'lerin güvenli bir şekilde oluşturulması, saklanması ve yönetilmesi kritiktir.
    - Edge Fonksiyonlarının sadece gerekli Vault path'lerine erişim yetkisi olmalıdır.
    - Kullanıcının `VoltAgentExporter`'a girdiği `secretKey` (`clientSecretKey`) istemci tarafında dikkatli yönetilmelidir.

7.  **Testler:**
    - Edge Fonksiyonları için birim ve entegrasyon testleri.
    - `TelemetryServiceApiClient` ve `HistoryManager` entegrasyon testleri.
    - Anahtar doğrulamasının ve veri yazma işlemlerinin uçtan uca testi.

## Veritabanı Tablo Şemaları (Özet - Değişiklik Yok)

### `projects`

- Sütunlar: `id`, `account_id`, `name`, `public_key UNIQUE NOT NULL`, `created_at`, `updated_at`, vb.
  - **NOT:** `secret_key` veya `secret_key_hash` YOK.

### `agent_history_entries`

- Sütunlar: `id`, `account_id`, `project_id`, `agent_id`, `event_timestamp`, `input`, `output`, `status`, `steps`, `usage`, `agent_snapshot`, `sequence_number`, `created_at`, `updated_at`, vb.
- RLS: Doğrudan `INSERT` yok. `SELECT` yetkisi "account members" için.

### `timeline_events`

- Sütunlar: `id`, `account_id`, `history_entry_id`, `event_timestamp`, `name`, `affected_node_id`, `data`, `type`, `created_at`, `updated_at`, vb.
- **ÖNEMLİ:** Bu tablo artık kullanılmayacak. Yerine `agent_timeline_events` kullanılacak. (Bu bölüm ileride kaldırılabilir.)

### `agent_timeline_events` (Yeni Tablo)

- Sütunlar:
  - `id uuid PRIMARY KEY DEFAULT uuid_generate_v4()`
  - `account_id uuid NOT NULL REFERENCES basejump.accounts(id)`
  - `project_id uuid NOT NULL REFERENCES public.projects(id)`
  - `history_entry_id uuid NOT NULL REFERENCES public.agent_history_entries(id) ON DELETE CASCADE`
  - `value JSONB NOT NULL` (Tüm `TimelineEvent` nesnesini veya ilgili veriyi JSON olarak saklar)
  - `created_at TIMESTAMPTZ DEFAULT now()`
  - `updated_at TIMESTAMPTZ DEFAULT now()`
  - `created_by uuid REFERENCES auth.users(id)`
  - `updated_by uuid REFERENCES auth.users(id)`
- RLS:
  - `INSERT`: Edge fonksiyonları tarafından `service_role` ile yapılacak. Doğrudan kullanıcı izni olmayacak. `value` alanı geçerli bir JSON olmalıdır.
  - `SELECT`: Kullanıcılar, üyesi oldukları hesaba ve projeye ait `agent_history_entries` kaydı ile ilişkili `agent_timeline_events` kayıtlarını okuyabilmelidir. (Yani `history_entry_id` üzerinden `agent_history_entries`'deki `account_id` ve `project_id` kontrolü ile).
  - `UPDATE`: Edge fonksiyonları tarafından `service_role` ile yapılacak. Sadece `value` alanı güncellenebilir olmalı.
  - `DELETE`: Kaskad silme (`ON DELETE CASCADE`) ile veya özel bir kural ile yönetilebilir. Şimdilik doğrudan silme izni yok.

## Telemetri Servisi Entegrasyonu Yapılacaklar Listesi (Vault & Edge Function Mimarisi)

- [x] **1. Supabase Proje ve Veritabanı Yapılandırması**
  - [x] Mevcut Supabase projesi kullanılacak.
  - [x] `projects` tablosuna `public_key TEXT UNIQUE NOT NULL` sütunu eklendi.
  - [x] `projects` tablosundan `secret_key` / `secret_key_hash` sütunları kaldırıldı.
  - [x] `agent_history_entries` tablosu oluşturuldu ve RLS ayarlandı.
  - [x] **YENİ:** `agent_timeline_events` tablosu (`20250512183007_agent_timeline_events.sql` migrasyonu ile, `value JSONB` ve `project_id` içerecek şekilde) oluşturuldu ve RLS ayarlandı.
  - [x] **YENİ:** Eski `timeline_events` tablosu (`20250509194256_timeline_events.sql` ve `20250512183008_drop_timeline_events.sql` migrasyonları ile) ve ilgili RLS/tetikleyiciler silindi.
  - [x] Eski RPC migrasyon dosyaları silindi.
- [x] **2. `create-project-and-keys` Edge Fonksiyonu ile Anahtar Yönetim Akışının Uygulanması**
  - [x] Proje oluşturma, `api_secret_key` üretimi, Vault'a kayıt ve kullanıcıya bir kerelik gösterim mantığını içeren `create-project-and-keys` Edge Fonksiyonu geliştirilecek.
- [x] **3. Telemetri Veri Aktarımı için Supabase Edge Fonksiyonlarının Geliştirilmesi**
  - [x] `export-agent-history` Edge Fonksiyonu geliştirilecek.
  - [x] `export-timeline-event` Edge Fonksiyonu geliştirilecek.
  - [x] `export-history-steps` Edge Fonksiyonu geliştirilecek.
  - [x] `update-agent-history` Edge Fonksiyonu geliştirilecek.
  - [x] `update-timeline-event` Edge Fonksiyonu geliştirilecek.
  - [x] **YENİ:** `export-timeline-event` ve `update-timeline-event` Edge Fonksiyonları, yeni `agent_timeline_events` tablosu (`value JSONB` alanı ve `project_id` ile) çalışacak şekilde güncellendi.
  - [ ] Edge Fonksiyonları için güvenlik (Vault erişimi, girdi doğrulama) sağlanacak. **(Lint sorunları şimdilik ertelendi, öncelik birim testlerinde)**
- [x] **4. `VoltAgentExporter` ve `TelemetryServiceApiClient` Güncellemeleri**
  - [x] `VoltAgentExporterOptions` arayüzü (`baseUrl` içerecek şekilde) güncellenecek.
  - [x] `TelemetryServiceApiClient`, Edge Fonksiyonlarını çağıracak şekilde geliştirilecek.
  - [x] `TelemetryServiceApiClient'a exportHistorySteps metodu eklenecek.`
  - [x] `VoltAgentExporter'a exportHistorySteps metodu eklenecek.`
  - [x] `TelemetryServiceApiClient'a updateAgentHistory metodu eklenecek.`
  - [x] `VoltAgentExporter'a updateHistoryEntry metodu eklenecek.`
  - [x] `TelemetryServiceApiClient'a updateTimelineEvent metodu eklenecek.`
  - [x] `VoltAgentExporter'a updateTimelineEvent metodu eklenecek.`
- [x] **5. `HistoryManager`, `VoltAgent`, `Agent` Sınıfı Güncellemeleri**
  - [x] `HistoryManager` constructor'ı güncellenecek.
  - [x] `addEntry` metodu `export-agent-history` Edge Fonksiyonunu çağıracak.
  - [x] `addEventToEntry` metodu `export-timeline-event` Edge Fonksiyonunu çağıracak.
  - [x] `addStepsToEntry` metodu `export-history-steps` Edge Fonksiyonunu çağıracak.
  - [x] `HistoryManager.updateEntry` metodu `update-agent-history` Edge Fonksiyonunu çağıracak (sadece ilgili alanlar için).
  - [x] `HistoryManager.updateTrackedEvent` metodu `update-timeline-event` Edge Fonksiyonunu çağıracak.
  - [x] **YENİ:** `HistoryManager`'ın `addEventToEntry` ve `updateTrackedEvent` metodları, telemetri verilerini yeni Edge Fonksiyonu beklentilerine uygun şekilde (`value JSONB` yapısını dikkate alarak) gönderecek şekilde güncellendi.
  - [ ] ~~**YENİ:** `MemoryManager` (ve altındaki `Memory` arayüzü/implementasyonları), timeline olaylarını ayrı `agent_timeline_events` tablosunda (`value JSONB` ve `project_id` ile) yönetecek şekilde güncellenecek.~~ **(KULLANICI İSTEĞİ ÜZERİNE ATLANDI - Yerel depolama mevcut yapıda kalacak)**
  - [x] `VoltAgent` ve `Agent` sınıfları telemetri yapılandırmasını yönetecek.
- [ ] **6. Güvenlik ve Yapılandırma Gözden Geçirmesi**
  - [ ] Vault anahtar yönetimi ve Edge Fonksiyon güvenliği incelenecek.
  - [ ] İstemci tarafı `clientSecretKey` yönetimi değerlendirilecek.
- [ ] **7. Testler**
  - [ ] Edge Fonksiyonları için birim ve entegrasyon testleri.
  - [ ] `TelemetryServiceApiClient` için birim testleri.
  - [ ] `VoltAgentExporter` için birim testleri.
  - [ ] `HistoryManager` entegrasyon testleri (telemetri kısmı için).
  - [ ] Anahtar doğrulamasının ve veri yazma işlemlerinin uçtan uca testi.
