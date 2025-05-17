---
title: What is LLaMA Factory? LLM Fine-Tuning
description: Wanted to teach an LLM some new tricks without losing your hair? Let's talk about LLaMA-Factory.
tags: [llm]
slug: llama-factory
image: https://cdn.voltagent.dev/2025-05-17-llmafactory/social.png
authors: omeraplak
---

import LlamaFactoryNavigator from '@site/src/components/blog-widgets/LlamaFactoryNavigator';

Large Language Models (LLMs) are gigantic AI models which generate text and code for a variety of tasks. Although such models are very powerful, however, they sometimes need to be tailored for specific purposes even more. Fine-tuning an LLM will accomplish this, but the process can be tricky without the right tools.

That's where I came across LLaMA-Factory, which made it much simpler for me to personalize the model.

![llama-factory](https://cdn.voltagent.dev/2025-05-17-llmafactory/llma.png)

## What's the Big Deal with LLaMA-Factory?

Basically, [LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory/) is just this totally awesome open-source thing by some great dev dude hiyouga. It's a one-stop-shop for fiddling with data from over 100 different LLMs and even VLMs (those are the ones which get visual). People _love_ this thing. It doesn't surprise me. It takes some serious headache out of fiddling around.

It's also mostly **platform-agnostic**, meaning it gets along with models and datasets from the big boys such as Hugging Face and ModelScope.

<LlamaFactoryNavigator />

### What's Under the Hood? (Spoiler: A Lot of Great Stuff)

This is not boilerplate code; LLaMA-Factory is _chock full_ of features. It's as though they thought of just about everything.

#### The Beat of the Beast: Models and Fine-Tuning Ability

- **A Whole Set of Models** Seriously, it's an LLM smorgasbord: LLaMAs (all varieties!), Mistrals, **ChatGLM**, Qwens, Gemmas, DeepSeeks. and so on. If you've ever heard of it, LLaMA-Factory probably helps fine-tune it. When I needed to try out a newer, more obscure model, this was my source, and voilà! It was available.

- **Tune It Your Way – So Many Approaches!:** It gets _really_ interesting from here.

- **The Classics:** You've got your standard **Supervised Fine-Tuning (SFT)** – my default, normally. Feel like taking a gamble? You can even attempt **(Continuous) Pre-training**.

  - **Fancy Preference Tuning:** Familiar with **PPO, DPO, KTO, or ORPO**? They're high-falutin' techniques for matching models to human preferences or bespoke goals, and LLaMA-Factory makes them accessible. No longer coding it up from scratch – an _enormous_ time saver.

- **QLoRA and LoRA to the Rescue:** And then there are of course, **QLoRA** and **QLoRA (Low-Rank Adaptation)**. They are _life savers_ for reduced VRAM training. QLoRA, with its various bit quantizations (2, 3, 4, 5, 6, or 8-bit), enables you to train surprisingly large models on hardware that otherwise can't. I've seen fantastic results with 4-bit QLoRA!

### Beyond the Basics: Efficiency, Usability, and the Full Toolkit

- **Lean, Mean, Tuning Machine – Efficiency is the Name of the Game:**

  - **Full Power or Light Touch:** 16-bit full-tuning is the choice if you can afford the horse power, or freeze-tuning for the light touch.

- **Smart Optimizations:** It has the latest algorithms and real-world hacks like **FlashAttention-2** and **Unsloth** for speed. For those who are serious about efficient training, there is support for techniques like **GaLore (Gradient Low-Rank Projection)**.
- **Quantization Galore:** Apart from QLoRA, it also supports other quantization techniques like **AQLM, AWQ, and GPTQ**, all in pursuit of the most compute bang for your buck.

- **No PhD Required (Mostly!):** Sure, LLMs are complex, but LLaMA-Factory tries to simplify it. It has a command-line interface (CLI) that's fairly straightforward, at least with their sample configs. The actual gem for most, however? The **LLaMA Board** – web UI! You can essentially point-and-click your way through making a fine-tuning task. That's rather cool, huh?

:::note More Than Training – The Whole Shebang

- **Task Flexibility:** You can train for multi-turn dialogue, tool use, image understanding, visual grounding, video classification, audio understanding. it's very varied, ranging from LLMs to VLMs.
- **Keep an Eye on Things:** Experiment tracking is built into packages like **LlamaBoard, TensorBoard, Wandb, MLflow, and SwanLab**. Seeing those loss curves decrease is _so_ satisfying.
- **Showtime! (Deployment & Inference):** Ready when you are, it offers faster inference modes, including an **OpenAI-style API** and support for workers like the **vLLM worker or SGLang worker**. You can also chat up your fine-tuned model in a hurry with `llamafactory-cli chat your_model_config.yaml`.
  :::

## Okay, But _Why_ This One? (The Good, and a Note of Realism)

Great observation! Yes, there are alternatives available, but LLaMA-Factory possesses this magic sweet spot:

- **It simply _works:_** Be you a veteran ML engineer or just LLM-curious, it reduces the curve of learning. I've watched newbies get up and running on it pretty quickly.
- **Saves Your Sanity (and GPU budget):** Efficiency focus is a massive win. Tuning can be computational hell, and anything that keeps it in line is a winner to me.

:::tip Pro Tip: Stay on the Cutting Edge!
Hi, check it out - LLaMA-Factory is always completely up-to-date! The coders jump on new models right away, and since it's open-source, individuals continually enhance it. Pretty cool, eh? You're basically getting the latest technology without all the hassle!
::::

## Want to Try It Out? Getting Your Hands Dirty with LLaMA-Factory

Alright, convinced enough to give it a shot? Or simply interested in it? Here is an absurdly abbreviated overview of how to begin.

### Check Out the Specs & Get the Goods (Installation)

- First, check the LLaMA-Factory GitHub for their **hardware requirements table** (GPU, RAM, etc.), as requirements vary with model size and tuning process.

- Next, clone their GitHub repo:

```
  git clone --depth 1 https://github.com/hiyouga/LLaMA-Factory.git`
```

- Next, `cd LLaMA-Factory`

- **pip install:** It's Python, so use a virtual environment (future you will thank you, trust me). Then `pip install -e ".[torch,metrics]"` is where you start. They also have extras options, e.g., `bitsandbytes` for QLoRA, or `vllm` for fast inference.
- **Alternative - Docker:** If Docker is your thing, they've got Dockerfiles! Look at the `docker` directory in their repo for configurations for CUDA, NPU, and ROCm. This can simplify environment management.
  - Their `README` has all the install options for your target OS and hardware.

:::important A Note on Production Scale
A Grain of Reality: LLaMA-Factory is wonderful for experimenting and tuning, and even comes with deployment APIs, but scaling a model to a super-scalled, high-load _production_ environment with lots of traffic might still require some more, special MLOps tools and some additional, manual tuning on top of what LLaMA-Factory can provide out of the box. It gets you _really_ far, but it is worth noting for high-scale deployments.
:::

### Feeding the Beast (Data Preparation)

- Your data needs to be LLaMA-Factory-readable format, usually JSON files. You might have **customer support dialogs to learn from, or product descriptions to write in some specific witty tone.**
- One key file to note here is `data/dataset_info.json`. You'll edit this to tell LLaMA-Factory about your own custom dataset – where it is, what format it's in, etc. It supports local datasets, Hugging Face datasets, and ModelScope Hub content.
- Their `data/README.md` is _read-once_ for this step. It specifies formats and has example datasets to show the structure.

### Let's Get Tuning! (Running a Job)

        - **The CLI Way:** For users who love the command line, you'll typically run fine-tuning via the `llamafactory-cli` tool. It might look something like this:

```
llamafactory-cli train examples/train_lora/llama3_lora_sft.yaml
```

That sorcery is in that `.yaml` file. LLaMA-Factory have plenty of sample YAML config files within their `examples` directory (e.g., LoRA SFT on Llama 3, or DPO on Mistral). They're great to use as a starting point. You simply copy one, adapt it to your model and data, set your hyperparameters (learning rate, epochs, batch size), and off it goes.

**The LLaMA Board (Web UI):** If YAML files make your eyes squint, or you prefer getting through a GUI, get the web UI up and running!

`llamafactory-cli webui`
This puts up a Gradio interface where you select your model, dataset, fine-tuning method, and parameters using dropdowns and input fields. Good for experimenting and learning the options, especially if you're new to this.

- **Quick Chat After Fine-Tuning:** Once tuned, attempt quickly with:
  `llamafactory-cli chat path_to_your_finetuned_model_or_adapter_config.yaml`

### "Where's the _Real_ Full Manual?" (Documentation is Your Friend)

- The _real_ treasure map is the official doc: `https://llamafactory.readthedocs.io/en/latest/`. Bookmark it. Seriously.
- And don't overlook the `examples` directory in the GitHub repository. It's packed with scripts and configurations. I catch myself going back to them often.
- Struggling? GitHub Issues have answers, or you can ask your own question.

## Taking It Further (Advanced Bits)

Once you have a model you're happy with, share or use it more widely. LLaMA-Factory helps you with that too:

- **Exporting Your Model:** They provide an `export_model.py` script (or `llamafactory-cli export your_config.yaml` command). Convenient to merge LoRA adapters into the base model for an independent fine-tuned model.
- **Hugging Face Hub Sharing:** Once exported, it's simple to share your new model on the Hugging Face Hub. The exported format is largely compatible.

So yea, that's LLaMA-Factory in a nutshell, with a bit more on how you'd actually get up and running with it. If you're interested in getting your toes wet in the waters of LLM fine-tuning and need a tool that's powerful, agile, and won't cost you a kidney to be able to afford compute time (almost!), then you should _definitely_ give it a look.

## Dive Deeper

- **The Source of All Goodness (GitHub):** [hiyouga/LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory)
- **The Manual (Docs):** [llamafactory.readthedocs.io](https://llamafactory.readthedocs.io/en/latest/)
- **The Brainy Paper (ACL 2024):** [LlamaFactory: Unified Efficient Fine-Tuning of 100+ Language Models](https://arxiv.org/abs/2403.13372) (For when you feel like being _extra_ smart!)
