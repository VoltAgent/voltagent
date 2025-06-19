<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br/>
<br/>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br/>

# VoltAgent with Dynamic Parameters

Bu örnek **Dynamic Values** özelliğini basit bir şekilde gösterir. Tek bir agent'in farklı kullanıcı kontekstlerine göre nasıl farklı davrandığını öğrenebilirsin.

## Özellikler

✨ **Dynamic Instructions** - Role-based agent behavior  
🚀 **Dynamic Models** - Tier-based model selection  
🔧 **Dynamic Tools** - Role-based tool access  
🔄 **Context Aware** - Single agent, multiple behaviors

## Neden Dynamic Parameters?

**Eski yöntem (Statik):**

```typescript
// ❌ Her kontekst için ayrı agent gerekir
const adminAgent = new Agent({ instructions: "You are an admin" });
const userAgent = new Agent({ instructions: "You are a user assistant" });
```

**Yeni yöntem (Dynamic):**

```typescript
// ✅ Tek agent, farklı kontekstler
const agent = new Agent({
  instructions: ({ userContext }) => {
    const role = userContext.get("role");
    return role === "admin" ? "You are an admin" : "You are a user assistant";
  },
});
```

## Çalıştırma

1. **Dependencies kur:**

```bash
npm install
```

2. **Environment ayarla:**
   OpenAI API key'ini `.env` dosyasına ekle:

```
OPENAI_API_KEY=your_api_key_here
```

3. **Demo çalıştır:**

```bash
npm run dev
```

## Test Scenarios

The example demonstrates 3 different user types:

### 1. Basic User (Free Tier)

- **Model:** GPT-3.5 Turbo
- **Tools:** Only greeting tool
- **Access:** Basic functionality

### 2. Admin User (Premium Tier)

- **Model:** GPT-4o Mini
- **Tools:** Greeting + Admin tools
- **Access:** System management privileges

### 3. Premium User

- **Model:** GPT-4o Mini
- **Tools:** Greeting tool (premium experience)
- **Access:** Enhanced service quality

## Kod Örnekleri

### Dynamic Instructions

```typescript
const dynamicInstructions = ({ userContext }) => {
  const role = userContext.get("role");
  if (role === "admin") {
    return "You are an admin assistant with special privileges.";
  } else {
    return "You are a helpful assistant.";
  }
};
```

### Dynamic Model Selection

```typescript
const dynamicModel = ({ userContext }) => {
  const tier = userContext.get("tier");
  return tier === "premium"
    ? openai("gpt-4o-mini") // Premium model
    : openai("gpt-3.5-turbo"); // Basic model
};
```

### Dynamic Tools

```typescript
const dynamicTools = ({ userContext }) => {
  const tools = [basicTool];
  if (userContext.get("role") === "admin") {
    tools.push(adminTool);
  }
  return tools;
};
```

## Use Cases

- **SaaS Applications:** Different service levels based on subscription tiers
- **Multi-user Systems:** Role-based authorization
- **Enterprise Applications:** Department-based tool access
- **Customer Support:** Context-aware assistance

---

**Daha fazla örnek için:** [VoltAgent Examples](https://github.com/voltagent/voltagent/tree/main/examples)

## Next Steps

1. **Customize for your use case** - Modify the user context structure
2. **Add more tools** - Create permission-based tool sets
3. **Integrate with auth** - Connect with your authentication system
4. **Deploy to production** - Scale with dynamic parameters

---

<div align="center">
<strong>Ready to build context-aware AI agents?</strong><br>
<a href="https://voltagent.dev/docs/getting-started">Get Started</a> | 
<a href="https://s.voltagent.dev/discord">Join Discord</a> | 
<a href="https://github.com/voltagent/voltagent">Star on GitHub</a>
</div>
