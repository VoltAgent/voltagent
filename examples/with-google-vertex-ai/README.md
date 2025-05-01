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

<div align="center">
    <strong>VoltAgent is an open source TypeScript framework for building and orchestrating AI agents.</strong><br>
Escape the limitations of no-code builders and the complexity of starting from scratch.
    <br />
    <br />
</div>

<div align="center">
    
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)
    
</div>

<br/>

<div align="center">
<a href="https://voltagent.dev/">
<img width="896" alt="VoltAgent Schema" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>

</div>

## VoltAgent: Build AI Agents Fast and Flexibly

VoltAgent is an open-source TypeScript framework for creating and managing AI agents. It provides modular components to build, customize, and scale agents with ease. From connecting to APIs and memory management to supporting multiple LLMs, VoltAgent simplifies the process of creating sophisticated AI systems. It enables fast development, maintains clean code, and offers flexibility to switch between models and tools without vendor lock-in.

## Try This Example

To quickly get started with the Google Vertex AI example, run:

```bash
npm create voltagent-app@latest -- --example with-google-vertex-ai
```

## Set Up Your Environment Variables

1. **Copy the Example Environment File**

   First, copy the provided `.env.example` file to create your own `.env` file:

   ```bash
   cp .env.example .env
   ```

2. **Configure Google Cloud Credentials**

   Open the `.env` file and update the following variables with your Google Cloud project details and credentials:

   - `GOOGLE_CLOUD_PROJECT`
   - `GOOGLE_CLOUD_LOCATION`
   - `GOOGLE_APPLICATION_CREDENTIALS`

   For detailed instructions on obtaining and configuring these variables, see:

   - [Setting up authentication for Google Cloud](https://cloud.google.com/docs/authentication/getting-started)
   - [Creating and managing service account keys](https://cloud.google.com/iam/docs/creating-managing-service-account-keys)
   - [Vertex AI documentation](https://cloud.google.com/vertex-ai/docs/start/cloud-environment)

   > **Tip:** Make sure your service account has the necessary permissions for Vertex AI.

3. **Save the `.env` file** and proceed with running the example.

```
npm install
npm run dev
```
