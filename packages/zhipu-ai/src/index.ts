import {
  type BaseMessage,
  type GenerateObjectOptions,
  type GenerateTextOptions,
  type LLMProvider,
  type MessageRole,
  type ProviderObjectResponse,
  type ProviderObjectStreamResponse,
  type ProviderTextResponse,
  type ProviderTextStreamResponse,
  type StepWithContent,
  type StreamObjectOptions,
  type StreamTextOptions,
} from "@voltagent/core";
import {
  tool,
  type FinishReason,
  type GenerateObjectResult,
  type GenerateTextResult,
  type LanguageModelV1,
  type StreamObjectResult,
  type StreamTextResult,
} from "ai";
import type { z } from "zod";

// 定义智谱AI相关类型
export interface ZhipuProviderOptions {
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  do_sample?: boolean;
  stream?: boolean;
  request_id?: string;
  tools?: any[];
  response_format?: { type: 'text' | 'json_object' };
  stop?: string[];
  user_id?: string;
}

// 定义智谱AI请求消息格式
interface ZhipuMessage {
  role: string;
  content?: string;
  tool_calls?: ZhipuToolCall[];
  tool_call_id?: string;
}

interface ZhipuToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// 定义智谱AI响应格式
interface ZhipuResponse {
  id: string;
  created: number;
  model: string;
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string | null;
      tool_calls?: ZhipuToolCall[];
    };
    delta?: {
      role?: string;
      content?: string;
      tool_calls?: ZhipuToolCall[];
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 智谱AI模型供应商实现
 * 实现了对智谱AI API的调用和响应处理
 */
export class ZhipuProvider implements LLMProvider<LanguageModelV1> {
  private apiKey: string;
  private baseUrl: string;
  private defaultOptions: Partial<ZhipuProviderOptions>;

  constructor(options: ZhipuProviderOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

    // 提取基本配置作为默认配置
    this.defaultOptions = {
      temperature: options.temperature,
      top_p: options.top_p,
      max_tokens: options.max_tokens,
      do_sample: options.do_sample,
      stream: options.stream,
      response_format: options.response_format,
      stop: options.stop,
      user_id: options.user_id,
    };

    // 绑定方法以保持 'this' 上下文
    this.generateText = this.generateText.bind(this);
    this.streamText = this.streamText.bind(this);
    this.generateObject = this.generateObject.bind(this);
    this.streamObject = this.streamObject.bind(this);
    this.toMessage = this.toMessage.bind(this);
    this.createStepFromChunk = this.createStepFromChunk.bind(this);
    this.getModelIdentifier = this.getModelIdentifier.bind(this);
  }

  getModelIdentifier = (model: LanguageModelV1): string => {
    return model.modelId;
  };

  toMessage = (message: BaseMessage): ZhipuMessage => {
    // 将 VoltAgent 消息转换为智谱 AI 消息格式
    const zhipuMessage: ZhipuMessage = {
      role: message.role,
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
    };

    // 扩展消息以处理工具调用
    const extendedMessage = message as any;

    // 处理工具消息
    if (message.role === 'tool' && extendedMessage.id) {
      zhipuMessage.tool_call_id = extendedMessage.id;
    }

    // 处理助手消息中的工具调用
    if (message.role === 'assistant' && extendedMessage.tool_calls) {
      zhipuMessage.tool_calls = extendedMessage.tool_calls.map((call: any) => ({
        id: call.id || `call_${Date.now()}`,
        type: 'function',
        function: {
          name: call.name,
          arguments: typeof call.arguments === 'string' ? call.arguments : JSON.stringify(call.arguments)
        }
      }));

      // 如果有工具调用，content 可能为 null
      if (zhipuMessage.tool_calls && zhipuMessage.tool_calls.length > 0 && !zhipuMessage.content) {
        zhipuMessage.content = '';
      }
    }

    return zhipuMessage;
  };

  createStepFromChunk = (chunk: {
    type: string;
    [key: string]: any;
  }): StepWithContent | null => {
    if (chunk.type === "text" && chunk.text) {
      return {
        id: "",
        type: "text",
        content: chunk.text,
        role: "assistant" as MessageRole,
        usage: chunk.usage || undefined,
      };
    }

    if (chunk.type === "tool-call" || chunk.type === "tool_call") {
      return {
        id: chunk.toolCallId,
        type: "tool_call",
        name: chunk.toolName,
        arguments: chunk.args,
        content: JSON.stringify([
          {
            type: "tool_call",
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            args: chunk.args,
          },
        ]),
        role: "assistant" as MessageRole,
        usage: chunk.usage || undefined,
      };
    }

    if (chunk.type === "tool-result" || chunk.type === "tool_result") {
      return {
        id: chunk.toolCallId,
        type: "tool_result",
        name: chunk.toolName,
        result: chunk.result,
        content: JSON.stringify([
          {
            type: "tool_result",
            toolCallId: chunk.toolCallId,
            result: chunk.result,
          },
        ]),
        role: "assistant" as MessageRole,
        usage: chunk.usage || undefined,
      };
    }

    return null;
  };

  // 将智谱的工具转换为适合SDK的格式
  convertToolsToZhipuFormat = (tools: any[]): Record<string, any> | undefined => {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    const toolsMap: Record<string, any> = {};

    for (const agentTool of tools) {
      // Wrap the tool with Vercel AI SDK's tool helper
      const sdkTool = tool({
        description: agentTool.description,
        parameters: agentTool.parameters,
        execute: agentTool.execute,
      });

      toolsMap[agentTool.name] = sdkTool;
    }

    return toolsMap;
  }


  convertToolsToZhipuPostFormat = (tools: Record<string, any> | undefined): any[] | undefined => {
    if (!tools || Object.keys(tools).length === 0) {
      return undefined;
    }

    const zhipuTools = Object.entries(tools).map(([name, tool]) => {
      // 提取 Zod schema 的属性定义
      const zodSchema = tool.parameters?._def?.shape?.();
      const properties: Record<string, any> = {};
      const required: string[] = [];

      if (zodSchema) {
        for (const [key, value] of Object.entries(zodSchema)) {
          properties[key] = {
            type: 'string', // 默认使用 string 类型
            description: (value as { _def?: { description?: string } })._def?.description || key
          };

          // 如果该字段是必需的（非可选的），添加到 required 数组中
          if (typeof value === 'object' && value !== null && '_def' in value && !(value as any)._def.isOptional) {
            required.push(key);
          }
        }
      }

      return {
        type: 'function',
        function: {
          name: name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties: properties,
            required: required
          }
        }
      };
    });

    return zhipuTools;
  };

  // 处理智谱API调用
  async callZhipuAPI(options: {
    model: string;
    messages: ZhipuMessage[];
    tools?: Record<string, any> | undefined;
    stream?: boolean;
    [key: string]: any;
  }): Promise<Response> {
    // 移除重复属性
    const { model, messages, tools, ...otherOptions } = options;


    var formatTools = this.convertToolsToZhipuPostFormat(tools);

    const payload = {
      model,
      messages,
      tools: formatTools,
      ...this.defaultOptions,
      ...otherOptions,
    };



    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    return fetch(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  // 处理智谱API非流式响应
  async processZhipuResponse(response: Response): Promise<ZhipuResponse> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`智谱API请求失败: ${response.status} ${errorText}`);
    }
    return await response.json();
  }

  // 生成文本实现
  async generateText(
    options: GenerateTextOptions<LanguageModelV1>,
  ): Promise<ProviderTextResponse<GenerateTextResult<Record<string, any>, never>>> {
    const zhipuMessages = options.messages.map(this.toMessage);
    const zhipuTools = options.tools ? this.convertToolsToZhipuFormat(options.tools) : undefined;

    try {
      const response = await this.callZhipuAPI({
        model: this.getModelIdentifier(options.model),
        messages: zhipuMessages,
        tools: zhipuTools ? zhipuTools : undefined,
        stream: false,
      });

      const zhipuResponse = await this.processZhipuResponse(response);

      console.log('=========', zhipuResponse);



      const choice = zhipuResponse.choices[0];


      const messageContent = choice.message.content || '';

      console.log('messageContent', messageContent);


      // 处理 onStepFinish 回调
      if (options.onStepFinish) {
        if (messageContent) {
          const step = this.createStepFromChunk({
            type: "text",
            text: messageContent,
            usage: zhipuResponse.usage,
          });
          if (step) await options.onStepFinish(step);
        }

        // 处理工具调用
        const toolCalls = choice.message.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          // conversationHistory.add({
          //   'role': 'assistant',
          //   'tool_calls': response['tool_calls'],
          // });
          zhipuMessages.push({
            role: 'assistant',
            tool_calls: toolCalls,
          });

          for (const toolCall of toolCalls) {
            // 确保可以正确解析工具调用参数
            let args;
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch (e) {
              console.error('解析工具调用参数失败:', e);
              args = { expression: toolCall.function.arguments.trim() };
            }

            const step = this.createStepFromChunk({
              type: "tool_call",
              toolCallId: toolCall.id,
              toolName: toolCall.function.name,
              args: args,
              usage: zhipuResponse.usage,
            });
            if (step) await options.onStepFinish(step);
          }
        }
      }

      // 准备工具调用信息
      const toolCalls = choice.message.tool_calls?.map(async tool => {
        // 解析参数
        let parsedArgs;
        try {
          parsedArgs = JSON.parse(tool.function.arguments);
        } catch (e) {
          console.error('解析工具调用参数失败:', e);
          parsedArgs = { expression: tool.function.arguments.trim() };
        }

        console.log('工具调用参数:', parsedArgs);
        console.log(tool.function.name);
        const toolResult = await zhipuTools![tool.function.name].execute(parsedArgs)
        if (toolResult) {
          console.log('toolResult', toolResult);
          // 添加工具执行结果到消息历史
          zhipuMessages.push({
            role: 'tool',
            content: JSON.stringify(toolResult),
            tool_call_id: tool.id
          });

          // 递归调用 generateText 以继续对话
          const continueResponse = await this.generateText({
            ...options,
            messages: zhipuMessages as BaseMessage[],
          });

          // 合并工具调用结果
          return {
            toolCallId: tool.id,
            toolName: tool.function.name,
            args: parsedArgs,
            result: toolResult,
            continueResponse: continueResponse
          };
        }

        return {
          toolCallId: tool.id,
          toolName: tool.function.name,
          args: parsedArgs,
        };
      }) || [];

      // 修改结果对象创建和返回部分
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        // 如果有工具调用，等待所有工具调用完成
        const toolCallResults = await Promise.all(toolCalls);

        // 获取最后一个工具调用的继续对话响应作为最终结果
        const lastToolCallResult = toolCallResults[toolCallResults.length - 1];
        if (lastToolCallResult && lastToolCallResult.continueResponse) {
          return lastToolCallResult.continueResponse;
        }
      }

      // 如果没有工具调用，返回普通响应
      const result: GenerateTextResult<Record<string, any>, never> = {
        text: messageContent,
        finishReason: choice.finish_reason as FinishReason,
        usage: {
          promptTokens: zhipuResponse.usage.prompt_tokens,
          completionTokens: zhipuResponse.usage.completion_tokens,
          totalTokens: zhipuResponse.usage.total_tokens,
        },
        toolCalls: toolCalls,
        toolResults: [],
        warnings: [],
        experimental_providerMetadata: {},
        request: { timestamp: new Date() },
        response: { id: zhipuResponse.id, timestamp: new Date(), modelId: zhipuResponse.model },
        providerMetadata: {},
      } as any;

      return {
        provider: result,
        text: result.text,
        usage: result.usage,
        toolCalls: result.toolCalls,
        toolResults: result.toolResults,
        finishReason: result.finishReason,
      };
    } catch (error) {
      throw new Error(`生成文本失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 流式生成文本实现
  async streamText(
    options: StreamTextOptions<LanguageModelV1>,
  ): Promise<ProviderTextStreamResponse<StreamTextResult<Record<string, any>, never>>> {
    const zhipuMessages = options.messages.map(this.toMessage);
    const zhipuTools = this.convertToolsToZhipuFormat(options.tools || []);

    try {
      const response = await this.callZhipuAPI({
        model: this.getModelIdentifier(options.model),
        messages: zhipuMessages,
        tools: zhipuTools,
        stream: true,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`智谱API流式请求失败: ${response.status} ${errorText}`);
      }

      if (!response.body) {
        throw new Error('智谱API返回的响应没有正文');
      }

      // 保存this引用以在嵌套函数中使用
      const self = this;

      // 创建文本流的控制器和流
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let accumulated = "";

      // 实现自定义可迭代文本流
      const customStream = new TransformStream({
        async transform(chunk, controller) {
          // 确保传递的是字符串类型
          const chunkStr = typeof chunk === 'string' ? chunk :
            chunk instanceof Uint8Array ? decoder.decode(chunk) :
              JSON.stringify(chunk);
          controller.enqueue(chunkStr);
        },
      });

      // 处理响应流
      const reader = response.body.getReader();

      // 创建一个可读流来处理智谱AI的SSE响应
      const processStream = new ReadableStream({
        async start(controller) {
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.trim() === '') continue;

                if (line.trim() === 'data: [DONE]') {
                  // 流结束
                  break;
                }

                if (line.startsWith('data: ')) {
                  try {
                    const jsonData = JSON.parse(line.slice(6)); // 去掉 'data: ' 前缀

                    if (jsonData.choices && jsonData.choices.length > 0) {
                      const choice = jsonData.choices[0];

                      if (choice.delta && choice.delta.content) {
                        // 将增量内容添加到累积变量
                        const content = choice.delta.content;
                        accumulated += content;

                        // 发送到输出流
                        controller.enqueue(encoder.encode(content));


                        // 触发 onChunk 回调
                        if (options.onChunk) {
                          const step = self.createStepFromChunk({
                            type: "text",
                            text: content,
                          });
                          if (step) await options.onChunk(step);
                        }
                      }

                      // 处理工具调用增量
                      if (choice.delta && choice.delta.tool_calls) {
                        zhipuMessages.push({
                          role: 'assistant',
                          tool_calls: choice.delta.tool_calls,
                        });

                        // 工具调用处理逻辑
                        for (const toolCall of choice.delta.tool_calls) {
                          if (options.onChunk) {
                            // 确保可以正确解析工具调用参数
                            let args;
                            try {
                              args = JSON.parse(toolCall.function.arguments);
                            } catch (e) {
                              console.error('解析工具调用参数失败:', e);
                              args = { expression: toolCall.function.arguments.trim() };
                            }

                            const step = self.createStepFromChunk({
                              type: "tool_call",
                              toolCallId: toolCall.id,
                              toolName: toolCall.function.name,
                              args: args,
                            });

                            if (step) await options.onChunk(step);

                            // 收集完整的工具调用
                            if (choice.finish_reason === 'tool_calls' && zhipuTools && zhipuTools[toolCall.function.name]) {
                              // 执行工具调用
                              console.log('执行工具调用', toolCall.function.name, args);
                              const toolResult = await zhipuTools[toolCall.function.name].execute(args);

                              if (toolResult) {
                                // 添加工具执行结果到消息历史
                                zhipuMessages.push({
                                  role: 'tool',
                                  content: JSON.stringify(toolResult),
                                  tool_call_id: toolCall.id
                                });

                                // 向客户端发送工具结果事件
                                const resultStep = self.createStepFromChunk({
                                  type: "tool_result",
                                  toolCallId: toolCall.id,
                                  toolName: toolCall.function.name,
                                  result: toolResult,
                                });

                                if (resultStep && options.onChunk) {
                                  await options.onChunk(resultStep);
                                }

                                // 递归调用 streamText 以继续对话
                                if (options.onFinish && choice.finish_reason != 'tool_calls') {
                                  console.log('通知客户端当前流已完成');

                                  // 通知客户端当前流已完成
                                  const result = {
                                    text: accumulated,
                                    finishReason: "tool_calls" as FinishReason,
                                    usage: jsonData.usage ? {
                                      promptTokens: jsonData.usage.prompt_tokens,
                                      completionTokens: jsonData.usage.completion_tokens,
                                      totalTokens: jsonData.usage.total_tokens,
                                    } : undefined,
                                  };
                                  await options.onFinish(result as any);
                                }

                                // 启动新的流处理工具调用结果
                                console.log('启动新的流处理工具调用结果');

                                try {
                                  // 创建新的流实例而不是复用原有的流
                                  const newStreamResponse = await self.streamText({
                                    ...options,
                                    messages: zhipuMessages as BaseMessage[],
                                    // 确保新流的onChunk回调能够正常工作
                                    onChunk: options.onChunk,
                                  });

                                  // 将新流的内容连接到原有的输出流
                                  if (newStreamResponse.textStream) {
                                    console.log('新流创建成功，准备读取数据');
                                    const newReader = newStreamResponse.textStream.getReader();

                                    try {
                                      while (true) {
                                        const { done, value } = await newReader.read();
                                        if (done) {
                                          console.log('新流数据读取完成');
                                          break;
                                        }

                                        // 将新流的数据发送到当前输出流
                                        const contentValue = typeof value === 'string' ? value :
                                          ArrayBuffer.isView(value) ? decoder.decode(value as Uint8Array) :
                                            JSON.stringify(value);

                                        console.log('将新流数据写入当前流:', contentValue);

                                        // 输出到当前流
                                        controller.enqueue(encoder.encode(contentValue));

                                        // 更新累积内容
                                        accumulated += contentValue;
                                      }
                                    } catch (error) {
                                      console.error('读取新流数据出错:', error);
                                      if (options.onError) {
                                        options.onError(error instanceof Error ? error : new Error(String(error)));
                                      }
                                    }
                                  } else {
                                    console.warn('新流的textStream为空');
                                  }
                                } catch (error) {
                                  console.error('创建工具调用后续流处理错误:', error);
                                  if (options.onError) {
                                    options.onError(error instanceof Error ? error : new Error(String(error)));
                                  }
                                }
                              }
                            }
                          }
                        }
                      }

                      // 如果是最后一个 chunk 并且有 usage 信息
                      if (choice.finish_reason && jsonData.usage && choice.finish_reason !== 'tool_calls') {
                        // 处理最终结果

                        if (options.onFinish) {
                          const result = {
                            text: accumulated,
                            finishReason: choice.finish_reason as FinishReason,
                            usage: {
                              promptTokens: jsonData.usage.prompt_tokens,
                              completionTokens: jsonData.usage.completion_tokens,
                              totalTokens: jsonData.usage.total_tokens,
                            },
                          };
                          await options.onFinish(result as any);
                        }
                      }
                    }
                  } catch (e) {
                    console.error('解析智谱API流数据失败:', e);
                  }
                }
              }
            }
          } catch (error) {
            // 触发 onError 回调
            if (options.onError) {
              options.onError(error instanceof Error ? error : new Error(String(error)));
            } else {
              console.error('智谱API流处理错误:', error);
            }
            controller.error(error);
          } finally {


            controller.close();
          }
        }
      });

      // 连接流
      processStream.pipeTo(customStream.writable);

      // 创建结果对象
      const result: any = {
        textStream: customStream.readable,
      };

      return {
        provider: result,
        textStream: customStream.readable,
      };
    } catch (error) {
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }

  // 生成对象实现
  async generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<LanguageModelV1, TSchema>,
  ): Promise<ProviderObjectResponse<GenerateObjectResult<z.infer<TSchema>>, z.infer<TSchema>>> {
    const zhipuMessages = options.messages.map(this.toMessage);

    try {
      // 添加提示消息告诉模型我们需要 JSON 格式的输出
      const promptedMessages = [
        ...zhipuMessages,
        {
          role: 'system',
          content: `请以有效的 JSON 格式输出你的响应，它应该符合指定的 schema`,
        },
      ];

      const response = await this.callZhipuAPI({
        model: this.getModelIdentifier(options.model),
        messages: promptedMessages,
        stream: false,
        response_format: { type: 'json_object' },
      });

      const zhipuResponse = await this.processZhipuResponse(response);
      const content = zhipuResponse.choices[0].message.content || '';

      let parsedObject: any;
      try {
        parsedObject = JSON.parse(content);
      } catch (e) {
        throw new Error(`智谱API返回的不是有效的JSON: ${content}`);
      }

      // 验证对象是否符合 schema
      const parseResult = options.schema.safeParse(parsedObject);
      if (!parseResult.success) {
        throw new Error(`响应不符合指定的 schema: ${parseResult.error.message}`);
      }

      // 创建结果对象
      const result: any = {
        object: parseResult.data,
        finishReason: zhipuResponse.choices[0].finish_reason,
        usage: {
          promptTokens: zhipuResponse.usage.prompt_tokens,
          completionTokens: zhipuResponse.usage.completion_tokens,
          totalTokens: zhipuResponse.usage.total_tokens,
        },
      };

      // 处理 onStepFinish 回调
      if (options.onStepFinish) {
        const step = this.createStepFromChunk({
          type: "text",
          text: content,
          usage: zhipuResponse.usage,
        });
        if (step) await options.onStepFinish(step);
      }

      return {
        provider: result,
        object: result.object,
        usage: result.usage,
        finishReason: result.finishReason,
      };
    } catch (error) {
      throw new Error(`生成对象失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 流式生成对象实现
  async streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<LanguageModelV1, TSchema>,
  ): Promise<ProviderObjectStreamResponse<StreamObjectResult<z.infer<TSchema>, unknown, never>, z.infer<TSchema>>> {
    const zhipuMessages = options.messages.map(this.toMessage);

    try {
      // 添加提示消息告诉模型我们需要 JSON 格式的输出
      const promptedMessages = [
        ...zhipuMessages,
        {
          role: 'system',
          content: `请以有效的 JSON 格式输出你的响应，它应该符合指定的 schema`,
        },
      ];

      const response = await this.callZhipuAPI({
        model: this.getModelIdentifier(options.model),
        messages: promptedMessages,
        stream: true,
        response_format: { type: 'json_object' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`智谱API流式请求失败: ${response.status} ${errorText}`);
      }

      if (!response.body) {
        throw new Error('智谱API返回的响应没有正文');
      }

      // 保存schema引用，用于验证
      const schema = options.schema;

      // 创建对象流的控制器和流
      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          controller.enqueue(chunk);
        },
      });

      // 处理响应流
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // 启动处理
      (async () => {
        let buffer = "";
        let accumulated = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;

              if (line.trim() === 'data: [DONE]') {
                // 流结束
                break;
              }

              if (line.startsWith('data: ')) {
                try {
                  const jsonData = JSON.parse(line.slice(6)); // 去掉 'data: ' 前缀

                  if (jsonData.choices && jsonData.choices.length > 0) {
                    const choice = jsonData.choices[0];

                    if (choice.delta && choice.delta.content) {
                      // 将增量内容添加到累积变量
                      accumulated += choice.delta.content;

                      // 尝试解析 JSON（累积的部分可能尚未形成有效的 JSON）

                      if (choice.finish_reason) {
                        try {
                          const parsedObject = JSON.parse(accumulated);
                          const parseResult = schema.safeParse(parsedObject);

                          if (parseResult.success) {
                            transformStream.writable.getWriter().write({
                              isPartial: false, // 完整对象
                              object: parseResult.data,
                            });

                            // 触发 onFinish 回调
                            if (options.onFinish) {

                              await options.onFinish({
                                object: parseResult.data,
                              });
                            }
                          } else {
                            console.warn('响应不符合指定的 schema:', parseResult.error.message);
                          }
                        } catch (e) {
                          console.warn('智谱API返回的不是有效的JSON:', accumulated);
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.error('解析智谱API流数据失败:', e);
                }
              }
            }
          }
        } catch (error) {
          // 触发 onError 回调
          if (options.onError) {
            options.onError(error instanceof Error ? error : new Error(String(error)));
          } else {
            console.error('智谱API流处理错误:', error);
          }
          transformStream.writable.getWriter().abort(error);
        } finally {
          transformStream.writable.getWriter().close();
        }
      })();

      // 创建结果对象
      const result: any = {
        partialObjectStream: transformStream.readable,
      };

      return {
        provider: result,
        objectStream: transformStream.readable,
      };
    } catch (error) {
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }
}