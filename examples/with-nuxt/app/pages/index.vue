<script setup lang="ts">
import ToolExecution from '~/components/ToolExecution.vue';

interface AgentOutput {
    agentName: string;
    toolName?: string;
    input?: Record<string, any>;
    output?: Record<string, any>;
    status: 'running' | 'completed' | 'error';
    summary?: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    parts: Array<{
        type: 'text';
        text: string;
    }>;
    agentOutputs?: AgentOutput[];
}

const loading = ref(false);
const submitted = ref(false);
const input = ref('');
const messages = ref<Message[]>([])
// Chat history persistence
const CHAT_HISTORY_KEY = 'voltagent-chat-history';
const CONVERSATION_ID_KEY = 'voltagent-conversation-id';

// Helper function to safely access localStorage
const isClient = process.client;
const safeLocalStorage = {
    getItem: (key: string) => isClient ? localStorage.getItem(key) : null,
    setItem: (key: string, value: string) => isClient && localStorage.setItem(key, value),
    removeItem: (key: string) => isClient && localStorage.removeItem(key)
};

// Load or generate conversation ID
const conversationId = ref(safeLocalStorage.getItem(CONVERSATION_ID_KEY) || crypto.randomUUID());

// Save conversation ID to localStorage when it changes
watch(conversationId, (newId) => {
    safeLocalStorage.setItem(CONVERSATION_ID_KEY, newId);
}, { immediate: true });

// Load chat history from localStorage on mount
onMounted(() => {
    const savedHistory = safeLocalStorage.getItem(CHAT_HISTORY_KEY);
    if (savedHistory) {
        try {
            messages.value = JSON.parse(savedHistory);
        } catch (error) {
            console.warn('Failed to load chat history:', error);
        }
    }
});

// Save chat history to localStorage
const saveChatHistory = () => {
    try {
        safeLocalStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.value));
    } catch (error) {
        console.warn('Failed to save chat history:', error);
    }
};

// Handle tool execution data from streaming response
const handleToolExecution = (chunk: any, message: Message) => {
    if (!message) return;

    if (!message.agentOutputs) {
        message.agentOutputs = [];
    }

    const toolName = chunk.toolName || chunk.tool || chunk.toolName;
    const agentName = getAgentNameFromTool(toolName);

    // Find existing agent output or create new one
    let agentOutput = message.agentOutputs.find(output => output.toolName === toolName || output.agentName === agentName);
    if (!agentOutput) {
        agentOutput = {
            agentName,
            toolName,
            status: 'running',
            input: {},
            output: {}
        };
        message.agentOutputs.push(agentOutput);
    }

    // Update based on chunk type
    switch (chunk.type) {
        case 'tool-call-start':
        case 'tool-input-start':
            agentOutput.status = 'running';
            if (chunk.args) {
                agentOutput.input = chunk.args;
            }
            break;
        case 'tool-call-end':
        case 'tool-input-end':
        case 'tool-result':
            agentOutput.status = 'completed';
            if (chunk.result) {
                agentOutput.output = chunk.result;
                agentOutput.summary = generateSummary(agentName, agentOutput.input, agentOutput.output);
            }
            break;
        case 'tool-call-delta':
        case 'tool-input-delta':
            // Handle partial results if needed
            break;
    }
};

// Clear chat history
const clearChatHistory = () => {
    messages.value = [];
    conversationId.value = crypto.randomUUID(); // Generate new conversation ID
    safeLocalStorage.removeItem(CHAT_HISTORY_KEY); // Clear saved chat history
};

// Map tool names to agent names
const getAgentNameFromTool = (toolName: string): string => {
    switch (toolName) {
        case 'uppercase':
            return 'UppercaseAgent';
        case 'countWords':
            return 'WordCountAgent';
        case 'writeStory':
            return 'StoryWriterAgent';
        default:
            return toolName || 'UnknownAgent';
    }
};

// Generate summary for agent output
const generateSummary = (agentName: string, input: any, output: any): string => {
    switch (agentName) {
        case 'UppercaseAgent':
            return `🔤 Converted text to uppercase: <strong>${output.result}</strong>`;
        case 'WordCountAgent':
            return `📊 Text analysis: <strong>${output.count} words</strong> found - ${output.words.slice(0, 5).join(', ')}${output.words.length > 5 ? '...' : ''}`;
        case 'StoryWriterAgent':
            return `📖 Creative story generated about: <strong>${input.text}</strong>`;
        default:
            return 'Tool execution completed';
    }
};

// Parse supervisor response and create individual tool outputs
const parseAndCreateToolOutputs = (text: string, message: Message) => {
    if (!message.agentOutputs) {
        message.agentOutputs = [];
    }

    // Clear existing outputs to avoid duplicates
    if (message.agentOutputs) {
        message.agentOutputs.length = 0;
    }

    // Extract the original input from the first user message
    const userMessage = messages.value.find(m => m.role === 'user');
    const originalInput = userMessage?.parts?.[0]?.text || '';

    // Define parser configurations for each tool
    const parsers = [
        {
            name: 'UppercaseAgent',
            toolName: 'uppercase',
            patterns: [
                /\*\*🔤 Uppercase Version:\*\*\s*\n(.+?)(?=\*\*|$)/s,
                /\*\*Uppercase Version:\*\*\s*(.+?)(?=\*\*|$)/s
            ],
            createOutput: (match: RegExpMatchArray) => ({
                result: match[1]?.trim() || ''
            }),
            createSummary: (output: any) => `🔤 Converted text to uppercase: <strong>${output.result}</strong>`
        },
        {
            name: 'WordCountAgent',
            toolName: 'countWords',
            patterns: [
                /\*\*📊 Word Analysis:\*\*\s*\n(.+?)(?=\*\*|$)/s,
                /\*\*Word Count:\*\*\s*(.+?)(?=\*\*|$)/s
            ],
            createOutput: () => {
                const words = originalInput.trim().split(/\s+/).filter(word => word.length > 0);
                return { count: words.length, words };
            },
            createSummary: (output: any) =>
                `📊 Text analysis: <strong>${output.count} words</strong> found - ${output.words.slice(0, 5).join(', ')}${output.words.length > 5 ? '...' : ''}`
        },
        {
            name: 'StoryWriterAgent',
            toolName: 'writeStory',
            patterns: [
                /\*\*📖 Creative Story:\*\*\s*\n(.+?)$/s,
                /\*\*50-Word Story:\*\*\s*(.+?)$/s
            ],
            createOutput: (match: RegExpMatchArray) => ({
                topic: originalInput,
                story: match[1]?.trim() || ''
            }),
            createSummary: () => `📖 Creative story generated about: <strong>${originalInput}</strong>`
        }
    ];

    // Process each parser
    parsers.forEach(parser => {
        let match: RegExpMatchArray | null = null;

        // Try each pattern until one matches
        for (const pattern of parser.patterns) {
            match = text.match(pattern);
            if (match) break;
        }

        if (match) {
            const output = parser.createOutput(match);
            if (!message.agentOutputs) {
                message.agentOutputs = [];
            }
            message.agentOutputs.push({
                agentName: parser.name,
                toolName: parser.toolName,
                status: 'completed',
                input: { text: originalInput },
                output,
                summary: parser.createSummary(output)
            });
        }
    });
};

const onSubmit = async () => {
    if (!input.value.trim()) return;

    // Add user message
    const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        parts: [
            {
                type: 'text',
                text: input.value,
            },
        ],
        agentOutputs: [],
    };
    messages.value.push(userMessage);
    saveChatHistory(); // Save to localStorage

    // Scroll to bottom when user message is added
    nextTick(() => {
        const chatContainer = document.querySelector('.overflow-y-auto') || document.querySelector('[class*="overflow-y"]');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });

    const currentInput = input.value;
    input.value = ''; // Clear input after adding message

    // Create assistant message placeholder for streaming
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        parts: [
            {
                type: 'text',
                text: '',
            },
        ],
        agentOutputs: [],
    };
    messages.value.push(assistantMessage);
    saveChatHistory(); // Save to localStorage

    // Scroll to bottom when new message is added
    nextTick(() => {
        const chatContainer = document.querySelector('.overflow-y-auto') || document.querySelector('[class*="overflow-y"]');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });

    // Set submitted status when message is sent to API
    submitted.value = true;

    try {
        // Use fetch directly for streaming
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: currentInput,
                conversationId: conversationId.value,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (reader) {
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Parse SSE format chunks
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const chunk = JSON.parse(line.slice(6));

                            // Transition from submitted to streaming when first chunk arrives
                            if (submitted.value) {
                                submitted.value = false;
                                loading.value = true;
                            }

                            if (chunk.type === 'text-delta' && chunk.delta) {
                                // Update the assistant message with new text
                                const messageIndex = messages.value.findIndex(m => m.id === assistantMessageId);
                                if (messageIndex !== -1 && messages.value[messageIndex]?.parts?.[0]) {
                                    messages.value[messageIndex].parts[0].text += chunk.delta;

                                    // Save progress to localStorage during streaming
                                    saveChatHistory();

                                    // Check if the response is complete and parse for tool results
                                    const currentText = messages.value[messageIndex].parts[0].text;
                                    if ((currentText.includes('**Uppercase Version:**') && currentText.includes('**Word Count:**') && currentText.includes('**50-Word Story:**')) ||
                                        (currentText.includes('**🔤 Uppercase Version:**') && currentText.includes('**📊 Word Analysis:**') && currentText.includes('**📖 Creative Story:**'))) {
                                        parseAndCreateToolOutputs(currentText, messages.value[messageIndex]);
                                        // Save final results after parsing tool outputs
                                        saveChatHistory();
                                    }

                                    // Force scroll to bottom after DOM update
                                    nextTick(() => {
                                        const chatContainer = document.querySelector('.overflow-y-auto') || document.querySelector('[class*="overflow-y"]');
                                        if (chatContainer) {
                                            chatContainer.scrollTop = chatContainer.scrollHeight;
                                        }
                                    });
                                }
                            } else if (chunk.type === 'tool-call-start' || chunk.type === 'tool-call-delta' || chunk.type === 'tool-call-end' ||
                                chunk.type === 'tool-input-start' || chunk.type === 'tool-input-delta' || chunk.type === 'tool-input-end' ||
                                chunk.type === 'tool-result') {
                                // Handle tool execution
                                console.log('Tool execution chunk:', chunk);
                                const messageIndex = messages.value.findIndex(m => m.id === assistantMessageId);
                                if (messageIndex !== -1 && messages.value[messageIndex]) {
                                    handleToolExecution(chunk, messages.value[messageIndex]);
                                    // Save progress after tool execution updates
                                    saveChatHistory();
                                }
                            }
                        } catch (e) {
                            // Ignore parsing errors for malformed chunks
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error generating response:', error);
        // Update the assistant message with error
        const messageIndex = messages.value.findIndex(m => m.id === assistantMessageId);
        if (messageIndex !== -1 && messages.value[messageIndex]?.parts?.[0]) {
            messages.value[messageIndex].parts[0].text = 'Sorry, there was an error processing your request.';
            // Save error state to localStorage
            saveChatHistory();
        }
    } finally {
        loading.value = false;
        submitted.value = false;
        // Final save to ensure all state is persisted
        saveChatHistory();
    }
};
</script>

<template>
    <div>
        <UPageHero id="features" title="Nuxt + Nuxt UI + Voltagent AI"
            description="Watch how the supervisor delegates tasks to specialized agents"
            headline="Supervisor Agent with Sub-Agents." :ui="{
                container: 'lg:py-10', // Adjust height here
            }" />
        <div class="mx-4 md:mx-auto md:max-w-screen-md border border-gray-800 rounded-lg">
            <UChatPalette class="p-0" :ui="{ content: 'overflow-y-auto flex-1 flex flex-col py-0 max-h-[500px]' }">
                <div class="py-2">
                    <UChatMessages :messages="messages"
                        :status="submitted ? 'submitted' : loading ? 'streaming' : 'ready'"
                        auto-scroll-icon="i-lucide-arrow-down" :auto-scroll-icon-always="true"
                        :should-scroll-to-bottom="true" :should-auto-scroll="true"
                        class="sm:py-0 px-10 h-full">

                        <!-- Custom content slot to add tool outputs after assistant messages -->
                        <template #content="{ message }">
                            <!-- Display the message text -->
                            <div v-for="(part, index) in message.parts" :key="`part-${index}`" class="text-sm whitespace-pre-wrap">
                                {{ (part as any).text || '' }}
                            </div>

                            <!-- Tool Outputs immediately after assistant message -->
                            <div v-if="message.role === 'assistant' && (message as any).agentOutputs && (message as any).agentOutputs.length > 0"
                                class="mt-4 space-y-3">
                                <div v-for="agentOutput in (message as any).agentOutputs"
                                    :key="`${message.id}-${agentOutput.agentName}`">
                                    <ToolExecution :tool-name="agentOutput.toolName || agentOutput.agentName"
                                        :status="agentOutput.status" :input="agentOutput.input || {}"
                                        :output="agentOutput.output" :summary="agentOutput.summary" />
                                </div>
                            </div>
                        </template>
                    </UChatMessages>
                </div>

                <!-- <UCard variant="subtle" class="flex-1 flex items-center justify-center py-8 mx-8">
                    <div class="w-full space-y-6">

                        <ToolExecution tool-name="countWords" status="completed"
                            :input="{ text: 'Count the words in the text.' }" :output="{
                                type: 'json',
                                value: {
                                    count: 6,
                                    words: ['Count', 'the', 'words', 'in', 'the', 'text.']
                                }
                            }"
                            summary="The text &quot;Count the words in the text.&quot; contains <strong>6 words</strong>" />

                        <ToolExecution tool-name="getWeather" status="completed"
                            :input="{ location: 'Tokyo', units: 'metric' }" :output="{
                                type: 'json',
                                value: {
                                    location: 'Tokyo',
                                    temperature: 24,
                                    condition: 'sunny',
                                    humidity: 65,
                                    windSpeed: 8
                                }
                            }" summary="Current weather in Tokyo: <strong>24°C</strong> and sunny" />

                        <ToolExecution tool-name="analyzeData" status="running"
                            :input="{ dataset: 'sales_data.csv', analysis: 'trend' }" />
                    </div>
                </UCard> -->
                <!-- Placeholder when no messages -->
                <div v-if="messages.length === 0" class="flex-1 flex items-center justify-center py-8 ">
                    <div class="text-center text-gray-500">
                        <div class="text-2xl mb-2">💬</div>
                        <p class="text-lg font-medium">Start a conversation</p>
                        <p class="text-sm">Type your message below to begin chatting</p>
                    </div>
                </div>
                <template #prompt>
                    <UChatPrompt v-model="input" :status="loading ? 'streaming' : 'ready'"
                        class="[view-transition-name:chat-prompt]" variant="subtle" @submit="onSubmit">
                        <UChatPromptSubmit color="neutral" class="mx-2" />
                    </UChatPrompt>
                </template>
            </UChatPalette>
        </div>

        <!-- Clear chat button below chat box -->
        <div v-if="messages.length > 0" class="flex justify-center mt-4">
            <UButton @click="clearChatHistory" variant="outline" color="neutral" size="sm">
                <UIcon name="i-lucide-trash-2" class="w-4 h-4 mr-2" />
                Clear Chat History
            </UButton>
        </div>
    </div>
</template>
