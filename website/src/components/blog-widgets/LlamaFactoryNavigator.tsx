import React, { useState } from "react";

type FineTuningGoal =
  | "unknown"
  | "limited_vram"
  | "instruction_following"
  | "human_alignment"
  | "speed_efficiency"
  | "easy_management"
  | "model_variety"
  | "deployment";

interface GoalDetail {
  name: string;
  description: string;
  recommendedFeatures: string[];
  quickTip: string;
}

const goals: Record<FineTuningGoal, GoalDetail | { name: string }> = {
  unknown: { name: "-- What's your fine-tuning goal? --" },
  limited_vram: {
    name: "I have limited GPU VRAM",
    description:
      "Fine-tuning large models on consumer hardware with memory constraints.",
    recommendedFeatures: [
      "QLoRA (2-8 bit quantization)",
      "LoRA (Low-Rank Adaptation)",
      "Parameter-Efficient Fine-Tuning (PEFT)",
    ],
    quickTip:
      "4-bit QLoRA can run surprisingly large models on consumer GPUs with 8-16GB VRAM!",
  },
  instruction_following: {
    name: "I want my model to follow instructions better",
    description:
      "Training the model to understand and execute specific instructions precisely.",
    recommendedFeatures: [
      "Supervised Fine-Tuning (SFT)",
      "Instruction-tuning datasets",
      "Multi-turn conversation training",
    ],
    quickTip:
      "Start with a good instruction dataset like Alpaca or use LLaMA-Factory's dataset templates.",
  },
  human_alignment: {
    name: "I need to align my model with human preferences",
    description:
      "Making the model's outputs more helpful, honest, and harmless according to human preferences.",
    recommendedFeatures: [
      "Direct Preference Optimization (DPO)",
      "Proximal Policy Optimization (PPO)",
      "ORPO (Optimal Reward Policy Optimization)",
      "KTO (K-Token Optimization)",
    ],
    quickTip:
      "DPO is often easier to implement than PPO and doesn't require a separate reward model.",
  },
  speed_efficiency: {
    name: "I want the fastest possible training",
    description:
      "Optimizing the fine-tuning process for speed without sacrificing quality.",
    recommendedFeatures: [
      "FlashAttention-2",
      "Unsloth accelerator",
      "DeepSpeed integration",
      "GaLore (Gradient Low-Rank Projection)",
    ],
    quickTip:
      "Using FlashAttention-2 can cut training time significantly while also reducing memory usage.",
  },
  easy_management: {
    name: "I need an easy way to manage training",
    description:
      "User-friendly interfaces and tools to set up and monitor the fine-tuning process.",
    recommendedFeatures: [
      "LLaMA Board web UI",
      "TensorBoard integration",
      "Weights & Biases (WandB) logging",
      "MLflow experiment tracking",
    ],
    quickTip:
      "LLaMA Board lets you configure fine-tuning jobs with a point-and-click interface, perfect for beginners!",
  },
  model_variety: {
    name: "I want to try many different open-source models",
    description:
      "Experimenting with various foundation models to find the best fit for your task.",
    recommendedFeatures: [
      "100+ model support (LLaMA, Mistral, ChatGLM, etc.)",
      "Hugging Face and ModelScope integration",
      "Model comparison tools",
    ],
    quickTip:
      "Smaller models like Mistral 7B can often perform surprisingly well for specific domains after fine-tuning.",
  },
  deployment: {
    name: "I need to deploy my model via an API",
    description:
      "Making your fine-tuned model available through an API for applications.",
    recommendedFeatures: [
      "OpenAI-compatible API server",
      "vLLM worker integration",
      "SGLang worker support",
      "Export model utilities",
    ],
    quickTip:
      "The 'llamafactory-cli chat' command provides a quick way to test your model before deployment.",
  },
};

export default function LlamaFactoryNavigator(): JSX.Element {
  const [selectedGoal, setSelectedGoal] = useState<FineTuningGoal>("unknown");

  const selectBaseClass =
    "appearance-none cursor-pointer w-full p-3 bg-gray-800 border rounded-md text-white focus:outline-none focus:ring-2 transition-all duration-200 text-sm";
  const selectFocusClass = "focus:ring-emerald-500/70 focus:border-emerald-400";
  const selectHoverClass = "hover:border-emerald-400/50";
  const selectBorderClass = "border-gray-700";

  const currentGoalDetails =
    selectedGoal !== "unknown" ? (goals[selectedGoal] as GoalDetail) : null;

  return (
    <div className="my-6 rounded-lg border-2 border-solid border-emerald-500 bg-gray-800 p-5 shadow-lg">
      <h4 className="mb-2 text-lg font-semibold text-white">
        LLaMA-Factory Fine-Tuning Navigator
      </h4>
      <p className="mb-1 text-sm text-gray-300">
        Select your fine-tuning goal to discover the best LLaMA-Factory features
        for your needs:
      </p>
      <div className="mb-4">
        <select
          id="goalSelect"
          value={selectedGoal}
          onChange={(e) => setSelectedGoal(e.target.value as FineTuningGoal)}
          className={`${selectBaseClass} ${selectBorderClass} ${selectHoverClass} ${selectFocusClass}`}
        >
          {Object.keys(goals).map((key) => (
            <option key={key} value={key} className="bg-gray-800">
              {goals[key as FineTuningGoal].name}
            </option>
          ))}
        </select>
      </div>

      {currentGoalDetails && selectedGoal !== "unknown" && (
        <div className="mt-6 rounded-md border border-emerald-500/50 bg-emerald-900/60 p-4 shadow-sm">
          <h5 className="mb-1 font-semibold text-emerald-400">
            {currentGoalDetails.name}
          </h5>
          <p className="mb-3 text-sm text-emerald-100">
            {currentGoalDetails.description}
          </p>
          <h6 className="mb-1 text-sm font-medium text-emerald-300">
            Recommended LLaMA-Factory Features:
          </h6>
          <ul className="list-inside list-disc space-y-1 text-sm text-emerald-100">
            {currentGoalDetails.recommendedFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <div className="mt-3 rounded bg-emerald-950/50 p-2 text-xs text-emerald-200">
            <span className="font-medium">💡 Quick Tip:</span>{" "}
            {currentGoalDetails.quickTip}
          </div>
        </div>
      )}
    </div>
  );
}
