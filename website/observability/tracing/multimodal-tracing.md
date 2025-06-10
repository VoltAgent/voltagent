---
title: Multimodal Tracing
---

# Multimodal Tracing

VoltOps provides observability for multimodal AI applications, tracking interactions across text, images, audio, video, and other data types. Rather than being limited to text-only interactions, modern AI applications can handle:

- **Text**: Traditional language processing, conversations, documents
- **Images**: Visual understanding, image analysis, computer vision tasks
- **Audio**: Speech recognition, audio analysis, voice interactions
- **Video**: Motion understanding, temporal analysis, multimedia content
- **Structured Data**: Tables, JSON, databases, APIs
- **Code**: Programming languages, technical documentation, software analysis

![VoltAgent VoltOps Platform Multi-modal Demo](https://cdn.voltagent.dev/docs/multi-modal-demo.gif)

The VoltOps platform provides a user-friendly way to interact with multi-modal agents:

- **File Attachment**: The conversation interface features a paperclip icon (📎) for adding files.
- **File Selection**: Users can browse and choose multiple image files and other supported formats from their device.
- **Visual Preview**: Selected files appear as thumbnail previews beneath the message input field.
- **Automatic Processing**: Upon message submission, the platform seamlessly converts uploaded content into proper data structures (ImagePart or FilePart using Base64 encoding) and formats the complete message with both text and media components before sending to the agent.

## Supported media formats

VoltOps handles multiple file types for comprehensive multimodal tracing:

- **Image files**: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`
- **Audio content**: `.mp3`, `.wav`, `.m4a`, `.ogg`
- **Document types**: `.pdf`, `.txt`, `.json`, structured data

All uploaded content is automatically processed, indexed, and made available for agent analysis while maintaining full traceability in the VoltOps observability dashboard.

## Why Multimodal Tracing Matters

:::note
Multimodality in LLM observability refers to an AI system's ability to process and understand multiple data types (modalities) simultaneously.
:::

#### Complex Input Processing

Modern AI applications often receive mixed-media inputs requiring different processing pipelines. VoltOps tracks how each modality flows through your system, helping you understand processing bottlenecks and optimization opportunities.

#### Cross-Modal Decision Making

AI agents frequently make decisions based on information from multiple sources. Tracing reveals how text prompts, visual context, and audio cues combine to influence agent behavior.

#### Performance Optimization

Different modalities have varying computational costs and processing times. Multimodal tracing helps identify which data types are expensive to process and where optimization efforts should focus.

#### Error Analysis Across Modalities

When multimodal AI fails, the issue could originate from any input type. Comprehensive tracing helps isolate whether problems stem from text understanding, image processing, audio quality, or cross-modal integration.
