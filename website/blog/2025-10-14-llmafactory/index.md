---
title: What is LLaMA Factory? LLM Fine-Tuning
description: A technical look at LLaMA Factory—a feature-rich toolkit for tuning large language models—and the latest updates through 2025.
tags: [llm]
slug: llama-factory
image: https://cdn.voltagent.dev/2025-05-17-llmafactory/social.png
authors: omeraplak
---

import LlamaFactoryNavigator from '@site/src/components/blog-widgets/LlamaFactoryNavigator';
import ZoomableMermaid from '@site/src/components/blog-widgets/ZoomableMermaid';

**Updated: October 14, 2025** — This article reflects the latest LLaMA-Factory updates, covering OFT/OFTv2 support, new model families (Intern-S1-mini, GPT-OSS, Llama 4, Qwen3, InternVL3), advanced optimizers (Muon, APOLLO), and expanded multimodal capabilities.

Large Language Models (LLMs) are AI models trained to generate text and code for various tasks. While these models are capable, they often need to be tailored for specific purposes through fine-tuning. Without the right tools, fine-tuning can be complex and resource-intensive.

This article examines **LLaMA‑Factory**—an open‑source toolkit for fine‑tuning and deploying large language models (LLMs) and vision‑language models (VLMs)—and how it has evolved through 2025.

![llama-factory](https://cdn.voltagent.dev/2025-05-17-llmafactory/llma.png)

## LLaMA-Factory Overview

[LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory/) is an open-source toolkit by developer hiyouga that provides a unified interface for fine-tuning over 100 different LLMs and VLMs. It abstracts away most of the complexity by offering standardized workflows for model fine-tuning. The toolkit is platform-agnostic and integrates with models and datasets from Hugging Face and ModelScope.

> **Note:** For general AI agents, prompt engineering, retrieval-augmented generation, or function calling may be sufficient. LLaMA-Factory is designed for cases where you need to specialize a model on custom data or specific behaviors through fine-tuning.

<LlamaFactoryNavigator />

### Core Features

LLaMA-Factory is not just boilerplate code; it includes a feature-rich set of capabilities for fine-tuning and deployment.

#### The Full Range of Models and Fine-Tuning Methods

- **Model Support**: The toolkit supports LLaMA variants, Mistral, ChatGLM, Qwen, Gemma, DeepSeek, and many other model families. If you need to work with a modern LLM or VLM, LLaMA-Factory likely supports it.

- **Training Approaches**: LLaMA-Factory supports the full range of training methods:
  - **Standard Methods**: Supervised Fine-Tuning (SFT) and Continuous Pre-training
  - **Preference Tuning**: Techniques like PPO, DPO, KTO, and ORPO for aligning models to human preferences or specific goals. These methods are implemented and accessible without coding them from scratch.
  - **LoRA and QLoRA**: Parameter-efficient methods using low-rank adaptation with quantization (2, 3, 4, 5, 6, or 8-bit) for training large models on limited VRAM. QLoRA with 4-bit quantization enables fine-tuning surprisingly large models on consumer hardware.

#### Efficiency and Usability

- **Training Efficiency**:
  - Full 16-bit training when you have the compute resources, or freeze-tuning (updating only part of the network) for lighter resource usage
  - Quantization techniques: AQLM, AWQ, and GPTQ for reduced memory footprint, all in pursuit of maximizing compute efficiency
  - Speed optimizations: FlashAttention-2, Unsloth, and GaLore (Gradient Low-Rank Projection) for faster training

- **Interface Options**: LLaMA-Factory tries to balance power with accessibility:
  - Command-line interface (CLI) with sample configurations
  - LLaMA Board: Web UI where you can configure fine-tuning tasks using dropdowns and input fields. This is particularly useful for experimenting and learning the available options.

:::note Beyond Training — The Full Toolkit

- **Task Flexibility**: You can train models for multi-turn dialogue, tool use, image understanding, visual grounding, video classification, and audio understanding. The task variety ranges from pure LLMs to multimodal VLMs.
- **Experiment Tracking**: Integration with LlamaBoard, TensorBoard, WandB, MLflow, and SwanLab for monitoring loss curves and hyperparameters. Watching those loss curves decrease is satisfying.
- **Deployment and Inference**: After training, you can export LoRA adapters into a merged model for Hugging Face, or call your model via an OpenAI-compatible API. Inference backends include vLLM worker and SGLang worker for faster inference. You can even chat with your fine-tuned model directly from the CLI: `llamafactory-cli chat your_model_config.yaml`
  :::

<ZoomableMermaid chart={`graph LR
LF[LLaMA Factory] --> MODELS[Model Support]
LF --> METHODS[Training Methods]
LF --> DEPLOY[Deployment]

MODELS --> LLM[100+ LLMs]
MODELS --> VLM[Vision-Language Models]

METHODS --> SFT[Supervised Fine-Tuning]
METHODS --> PREF[Preference Alignment]
METHODS --> LORA[LoRA/QLoRA]
METHODS --> QUANT[Quantization]

PREF --> PPO[PPO]
PREF --> DPO[DPO]
PREF --> KTO[KTO]
PREF --> ORPO[ORPO]

DEPLOY --> API[OpenAI-compatible API]
DEPLOY --> VLLM[vLLM Worker]
DEPLOY --> SGLANG[SGLang Worker]

style LF fill:#121E1B,stroke:#50C878,stroke-width:2px,color:#50C878
style MODELS fill:#0F1A15,stroke:#50C878,stroke-width:2px,color:#50C878
style METHODS fill:#0F1A15,stroke:#50C878,stroke-width:2px,color:#50C878
style DEPLOY fill:#0F1A15,stroke:#50C878,stroke-width:2px,color:#50C878`} />

## Why Use LLaMA‑Factory?

LLaMA-Factory hits a sweet spot between power and usability:

- **Accessible to All Levels**: ML engineers and newcomers can get models training quickly. It exposes cutting-edge research methods while hiding most boilerplate.
- **Compute Efficiency**: The focus on efficiency keeps compute costs under control. Fine-tuning can be computationally intensive, and anything that keeps costs reasonable is valuable.
- **Stay Current**: The maintainers actively incorporate new models and methods. Since it's open-source, the community continually improves it.

> **Note:** LLaMA‑Factory is open‑source and updated frequently. You benefit from the latest research without having to re-implement it yourself. Below are highlights added since spring 2025.

### What's New in 2025?

Recent additions include:

- **Orthogonal Finetuning (OFT) and OFTv2 (Aug 22 2025).** Parameter-efficient tuning methods that constrain updates to an orthogonal subspace, improving memory and compute efficiency. LLaMA-Factory supports both OFT and OFTv2.
- **Intern-S1-mini model support (Aug 20 2025).** Smaller InternLM models (Intern-S1-mini) can be fine-tuned through the toolkit.
- **GPT-OSS model support (Aug 6 2025).** Open-source GPT-OSS models are supported for fine-tuning.
- **New model families.** Earlier 2025 releases added support for GLM-4.1V, Qwen3, InternVL3, Llama 4, Qwen2.5-Omni and other models. Optimizers (Muon, APOLLO) were integrated, and SGLang was added as an inference backend. Support includes audio models (Qwen2-Audio, DeepSeek-R1) and multimodal models (MiniCPM-V).

To use these capabilities, update your repository and refer to the examples in the changelog.

:::tip Update Frequency
LLaMA-Factory receives regular updates. The developers add support for new models, and the open-source community contributes improvements.
:::

## Getting Started

Ready to try LLaMA-Factory? Here's how to get up and running.

### Requirements and Installation

First, check the LLaMA-Factory GitHub for their hardware requirements table (GPU, RAM, etc.) — requirements vary significantly based on model size and the tuning method you choose.

Clone the repository:

```bash
git clone --depth 1 https://github.com/hiyouga/LLaMA-Factory.git
cd LLaMA-Factory
```

Install with pip. It's Python, so use a virtual environment (future you will thank you):

```bash
pip install -e ".[torch,metrics]"  # extras like bitsandbytes enable QLoRA
```

They also have extra installation options. For example, `bitsandbytes` for QLoRA, or `vllm` for fast inference.

**Docker alternative**: If Docker is your preference, they provide Dockerfiles in the `docker` directory for CUDA, NPU, and ROCm configurations. This can simplify environment management.

:::important A Note on Production Scale
LLaMA-Factory is excellent for experimentation and fine-tuning, and includes deployment APIs. However, scaling a model to a high-load production environment with significant traffic might still require additional MLOps tools and infrastructure beyond what LLaMA-Factory provides. It gets you very far, but it's worth noting for large-scale deployments.
:::

### Data Preparation

Your data needs to be in a format LLaMA-Factory can read, usually JSON files. You might have customer support dialogues to learn from, or product descriptions you want the model to write in a specific tone.

One key file is `data/dataset_info.json`. You'll edit this to tell LLaMA-Factory about your custom dataset — where it is, what format it's in, etc. The toolkit supports:

- Local JSON files
- Hugging Face datasets
- ModelScope Hub content

Their `data/README.md` is worth reading for this step. It specifies the required formats and includes example datasets showing the structure.

### Running Fine-Tuning

**The CLI way**: For command-line users, you'll run fine-tuning via the `llamafactory-cli` tool:

```bash
llamafactory-cli train examples/train_lora/llama3_lora_sft.yaml
```

Sample YAML configuration files in the `examples` directory cover:

- LoRA SFT on Llama 3
- DPO on Mistral
- Other training scenarios

Copy a sample config, adapt it to your model and data, set hyperparameters (learning rate, epochs, batch size).

**Web UI method**: Launch the LLaMA Board UI:

```bash
llamafactory-cli webui
```

This launches a Gradio interface for selecting models, datasets, fine-tuning methods, and parameters.

**Test the model**: Chat with your fine-tuned model:

```bash
llamafactory-cli chat path_to_your_finetuned_model_or_adapter_config.yaml
```

### Post-Training

**Export model**: Merge LoRA adapters into the base model:

```bash
llamafactory-cli export your_config.yaml
```

**Hugging Face compatibility**: Exported models are compatible with Hugging Face Hub.

### Documentation Resources

- **Official Documentation**: [llamafactory.readthedocs.io](https://llamafactory.readthedocs.io/en/latest/)
- **Examples Directory**: GitHub repository with scripts and configurations
- **GitHub Issues**: Search existing issues or open new ones

## Summary

LLaMA-Factory is a toolkit for fine-tuning large language and vision-language models. It supports a range of models and training methods, including recent additions like OFT/OFTv2 and support for new model families.

The toolkit reduces boilerplate code for fine-tuning workflows while maintaining flexibility in model selection and training approaches.

## References

- **GitHub Repository**: [hiyouga/LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory)
- **Documentation**: [llamafactory.readthedocs.io](https://llamafactory.readthedocs.io/en/latest/)
- **Research Paper (ACL 2024)**: [LlamaFactory: Unified Efficient Fine-Tuning of 100+ Language Models](https://arxiv.org/abs/2403.13372)
