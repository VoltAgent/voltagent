<script setup lang="ts">
interface ToolExecutionProps {
    toolName: string;
    status: 'running' | 'completed' | 'error';
    input: Record<string, any>;
    output?: Record<string, any>;
    summary?: string;
}

const props = defineProps<ToolExecutionProps>();

const inputOpen = ref(false);
const outputOpen = ref(false);

// Get appropriate icon for each tool
const getToolIcon = (toolName: string) => {
    switch (toolName) {
        case 'uppercase':
            return 'i-lucide-type';
        case 'countWords':
            return 'i-lucide-hash';
        case 'writeStory':
            return 'i-lucide-book-open';
        default:
            return 'i-lucide-wrench';
    }
};

// Get appropriate color for each tool
const getToolColor = (toolName: string) => {
    switch (toolName) {
        case 'uppercase':
            return 'text-blue-500';
        case 'countWords':
            return 'text-green-500';
        case 'writeStory':
            return 'text-purple-500';
        default:
            return 'text-gray-500';
    }
};

// Format output for display
const formatOutput = (output: any) => {
    if (!output) return '';

    // Handle different output structures
    if (output.result) {
        return output.result;
    } else if (output.count !== undefined) {
        return `${output.count} words: ${output.words?.slice(0, 10).join(', ')}${output.words?.length > 10 ? '...' : ''}`;
    } else if (output.topic) {
        return `Story about: ${output.topic}`;
    }

    return JSON.stringify(output, null, 2);
};
</script>

<template>
    <UCard class="w-full">
        <template #header>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <UIcon :name="getToolIcon(toolName)" :class="getToolColor(toolName)" />
                    <h3 class="font-semibold text-lg">{{ toolName }}</h3>
                    <UBadge :color="status === 'completed' ? 'success' : status === 'error' ? 'error' : 'info'"
                        variant="soft">
                        {{ status === 'completed' ? 'completed' : status === 'error' ? 'error' : 'running' }}
                    </UBadge>
                </div>
            </div>
        </template>

        <div class="space-y-4">
            <!-- Input Section -->
            <UCollapsible v-model:open="inputOpen">
                <UButton variant="ghost" color="neutral"
                    class="w-full justify-between p-0 h-auto font-medium text-blue-500 hover:bg-color-transparent cursor-pointer click:bg-color-transparent"
                    trailing-icon="i-lucide-chevron-down" :ui="{
                        trailingIcon: inputOpen ? 'rotate-180 transition-transform duration-200' : 'transition-transform duration-200'
                    }">
                    Input
                </UButton>
                <template #content>
                    <div class="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <pre
                            class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ JSON.stringify(input, null, 2) }}</pre>
                    </div>
                </template>
            </UCollapsible>

            <!-- Output Section -->
            <UCollapsible v-if="output" v-model:open="outputOpen">
                <UButton color="neutral" variant="ghost"
                    class="w-full justify-between p-0 h-auto font-medium text-green-500 hover:bg-color-transparent cursor-pointer click:bg-color-transparent"
                    trailing-icon="i-lucide-chevron-down" :ui="{
                        trailingIcon: outputOpen ? 'rotate-180 transition-transform duration-200' : 'transition-transform duration-200'
                    }">
                    Output
                </UButton>
                <template #content>
                    <div class="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <pre
                            class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ JSON.stringify(output, null, 2) }}</pre>
                    </div>
                </template>
            </UCollapsible>

            <!-- Step Separator -->
            <USeparator label="→ step" />

            <!-- Summary -->
            <div v-if="summary" class="text-sm text-gray-600 dark:text-gray-400">
                <span v-html="summary"></span>
            </div>
        </div>
    </UCard>
</template>
