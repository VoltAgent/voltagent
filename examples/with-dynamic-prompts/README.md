# VoltAgent with Dynamic Prompts Example

Bu örnek, VoltAgent'ta dynamic prompt management'ın nasıl kullanılacağını gösterir.

## 🎯 Bu Örnekte Neler Var

- **VoltOpsClient** ile unified telemetry ve prompt management
- **Dynamic instructions** ile context-aware prompt loading
- **Template variables** ile personalized responses
- **Graceful fallback** VoltOps mevcut değilse static instructions kullanır

## 🚀 Kurulum

1. Dependencies'leri yükleyin:

```bash
npm install
```

2. Environment variables'ları ayarlayın (opsiyonel):

```bash
cp .env.example .env
# .env dosyasını OpenAI API key ile düzenleyin
```

3. Örneği çalıştırın:

```bash
npm run dev
```

## 🔧 Nasıl Çalışır

### 1. VoltOpsClient Kurulumu

```typescript
const voltOpsClient = new VoltOpsClient({
  baseUrl: process.env.VOLTOPS_BASE_URL || "https://api.voltops.dev",
  publicKey: process.env.VOLTOPS_PUBLIC_KEY || "demo-public-key",
  secretKey: process.env.VOLTOPS_SECRET_KEY || "demo-secret-key",
  telemetry: true,
  prompts: true,
});
```

### 2. Dynamic Instructions

```typescript
instructions: async (context) => {
  try {
    // VoltOps'tan dynamic prompt al
    return await context.prompts.getPrompt({
      promptName: "customer-support-agent",
      variables: {
        companyName: "VoltAgent Corp",
        supportLevel: context.userContext.get("tier") || "standard",
        language: context.userContext.get("language") || "en",
      },
    });
  } catch (error) {
    // Fallback static instructions
    return "You are a helpful customer support agent...";
  }
};
```

### 3. Context ile Kullanım

```typescript
const response = await agent.generateText("Hi, I need help with my account", {
  userContext: new Map([
    ["tier", "premium"],
    ["language", "en"],
  ]),
});
```

## 📊 Test Senaryoları

Örnek 3 farklı test senaryosu çalıştırır:

1. **Standard Customer** (tier: standard, language: en)
2. **Premium Customer** (tier: premium, language: en)
3. **Spanish Customer** (tier: standard, language: es)

Her test, farklı context'lerle dynamic prompt'un nasıl adapt olduğunu gösterir.

## 🎨 VoltOps Console Integration

VoltOps console'da `customer-support-agent` prompt'unu şu template ile oluşturabilirsiniz:

```liquid
You are a helpful customer support agent for {{companyName}}.

{% if supportLevel == 'premium' %}
🌟 You are providing PREMIUM support - offer detailed assistance and priority treatment.
{% elsif supportLevel == 'enterprise' %}
🏢 You are providing ENTERPRISE support - offer comprehensive solutions and dedicated assistance.
{% else %}
You are providing standard support - be helpful and professional.
{% endif %}

{% if language == 'es' %}
Responde en español. Sé amable y profesional.
{% elsif language == 'fr' %}
Répondez en français. Soyez aimable et professionnel.
{% else %}
Respond in English. Be friendly and professional.
{% endif %}

Support Guidelines:
- Always be polite and understanding
- Provide clear, actionable solutions
- Ask clarifying questions when needed
- Escalate complex issues when appropriate
```

## 🔄 Fallback Mechanism

Eğer VoltOps mevcut değilse veya prompt bulunammazsa, kod otomatik olarak static instructions'a fallback yapar:

```typescript
catch (error) {
  console.log('📝 Using fallback instructions (VoltOps not configured)');
  return `You are a helpful customer support agent for VoltAgent Corp...`;
}
```

Bu sayede development sırasında bile örnek sorunsuz çalışır!

## 📝 Notlar

- Environment variables opsiyoneldir - demo keys ile fallback çalışır
- OpenAI API key gereklidir
- Gerçek production'da VoltOps credentials'larınızı kullanın
