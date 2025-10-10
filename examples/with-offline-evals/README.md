# with-offline-evals

Bu örnek, VoltAgent’in yeni deney tanımlama API’lerini (`createExperiment` + `runExperiment`) hem Node.js ortamında hem de CLI üzerinden nasıl çalıştırabileceğinizi gösterir.

## Kurulum

```bash
pnpm install
```

## Node.js ile çalıştırma

```bash
pnpm --filter @examples/with-offline-evals dev
```

Komut, `src/index.ts` dosyasını TSX aracılığıyla çalıştırır ve ilerleme çıktısını konsola yazdırır. (Projeyi bağımsız kullanacaksanız klasöre girip `pnpm install && pnpm dev` şeklinde de çalıştırabilirsiniz.)

## CLI ile çalıştırma

`@voltagent/cli` aracını kullanarak aynı tanımı CLI üzerinden çalıştırabilirsiniz:

```bash
pnpm exec volt eval run \
  --experiment ./src/experiments/offline.experiment.ts \
  --dry-run
```

- `--dry-run` VoltOps’a veri göndermeden yerel skorlamayı çalıştırır.
- VoltOps üzerinde sonuçları tutmak isterseniz ortam değişkenlerini (`VOLTAGENT_API_URL`, `VOLTAGENT_PUBLIC_KEY`, `VOLTAGENT_SECRET_KEY`) tanımlayıp `--dry-run` bayrağını kaldırın.

## Dosya Yapısı

- `src/experiments/offline.experiment.ts` – Deney tanımı (`createExperiment`)
- `src/index.ts` – Programatik kullanım için Node.js betiği
- `README.md` – Bu dokümantasyon
