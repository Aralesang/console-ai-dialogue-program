import { OpenAI } from "https://deno.land/x/openai@v4.69.0/mod.ts";

// 配置中心
const API_CONFIG = {
    provider: "openai",// "ollama",  // 可切换为 "openai" 或 "ollama"
    openai: {
        apiKey: "sk-nyfdCahqDRpUt3EULXn7O8Yr5GTAmakA9PlVVeQOEEhZsWrI",
        baseURL: "https://api.lkeap.cloud.tencent.com/v1",
        model: "deepseek-r1" // 可用模型: deepseek-r1 deepseek-v3
    },
    ollama: {
        baseURL: "http://localhost:11434",  // Ollama默认地址
        model: "deepseek-r1:latest"  // 可用模型: deepseek-r1:latest llama3.2:latest
    },
    show_reasoning_content: true,// 是否显示推理内容,该配置仅限deepseek-r1模型时有效
    enable_multi_turn: true, // 是否启用多轮对话
    enable_mermoryy: true, // 是否启用记忆
};


// 初始化OpenAI客户端（仅用于OpenAI模式）
const openai = new OpenAI({
    apiKey: API_CONFIG.openai.apiKey,
    baseURL: API_CONFIG.openai.baseURL
});

type CustomDelta = {
    content?: string;
    reasoning_content?: string;
    role?: string;
};

type OllamaResponseChunk = {
    message?: {
        content: string;
    };
    done: boolean;
};

export default class DialogueEngine {
    // 使用 Deno 的标准输出 API
    encoder = new TextEncoder();
    /** 记忆 */
    memory = "";
    /** 历史记录 */
    history: string[] = [];
    /** 当前对话轮次 */
    round = 0;
    /** 当前历史记录文件名 */
    historyFileName = "";
    /** 系统消息缓存 */
    private system_message = "";


    /** 获取历史记录文件路径 */
    public get_history_path() {
        return "./history/" + this.historyFileName + ".json";
    }
    /** 获取配置 */
    public get_config() {
        if (API_CONFIG.provider === "openai") {
            return API_CONFIG.openai;
        } else {
            return API_CONFIG.ollama;
        }
    }

    public async sendRequest(input: string) {
        const message = this.buildMessage(input);
        //只有模型为deepseek-r1时才显示推理内容
        if (this.get_config().model.includes("deepseek-r1")) {
            console.log("\n" + "=".repeat(20) + "思考过程" + "=".repeat(20) + "\n");
            if (!API_CONFIG.show_reasoning_content) {
                console.log("思考中...");
            }
        }

        // 根据配置选择服务商
        if (API_CONFIG.provider === "openai") {
            await this.handleOpenAIRequest(message);
        } else {
            await this.handleOllamaRequest(message);
        }

        this.round++;
        this.update_history(input, this.system_message);
        this.system_message = "";  // 重置系统消息
    }

    /** 构建消息体 */
    private buildMessage(input: string): string {
        let message = this.memory;
        if (API_CONFIG.enable_multi_turn && this.history.length > 0) {
            message += this.history.join("\n");
        }
        return message + " user:" + input;
    }

    /** 处理OpenAI请求 */
    private async handleOpenAIRequest(message: string) {
        const completion = await openai.chat.completions.create({
            model: API_CONFIG.openai.model,
            messages: [{ role: 'user', content: message }],
            stream: true,
        });

        for await (const chunk of completion) {
            this.processOpenAIChunk(chunk);
        }
    }

    /** 处理Ollama请求 */
    private async handleOllamaRequest(message: string) {
        const response = await fetch(`${API_CONFIG.ollama.baseURL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: API_CONFIG.ollama.model,
                messages: [{ role: 'user', content: message }],
                stream: true
            })
        });

        if (!response.body) throw new Error("Ollama响应异常");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        console.log("\n" + "=".repeat(20) + "ollama的回复" + "=".repeat(20) + "\n");
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n");
            buffer = chunks.pop() || "";  // 保留未完成的数据

            for (const chunkStr of chunks) {
                if (!chunkStr.trim()) continue;
                try {
                    const chunk: OllamaResponseChunk = JSON.parse(chunkStr);
                    this.processOllamaChunk(chunk);
                } catch (e) {
                    console.error("JSON解析错误:", e);
                }
            }
        }
    }

    /** 处理OpenAI数据块 */
    private processOpenAIChunk(chunk: OpenAI.ChatCompletionChunk) {
        if (!chunk.choices?.length) {
            this.showTokenUsage(chunk.usage!);
            return;
        }

        const delta = chunk.choices[0].delta as CustomDelta;
        this.processDeltaContent(delta);
    }

    /** 处理Ollama数据块 */
    private processOllamaChunk(chunk: OllamaResponseChunk) {
        if (chunk.done) return;

        const content = chunk.message?.content || "";
        if (content) {
            Deno.stdout.write(this.encoder.encode(content));
            this.system_message += content;
        }
    }

    /** 处理内容片段 */
    private processDeltaContent(delta: CustomDelta) {
        if (delta.reasoning_content) {
            this.handleReasoningContent(delta.reasoning_content);
        }

        if (delta.content) {
            this.handleAnswerContent(delta.content);
        }
    }

    /** 处理推理内容 */
    private handleReasoningContent(content: string) {
        if (API_CONFIG.show_reasoning_content) {
            Deno.stdout.write(this.encoder.encode(content));
        }
    }

    /** 处理回答内容 */
    private handleAnswerContent(content: string) {
        if (!this.system_message) {
            console.log("\n" + "=".repeat(20) + "完整回复" + "=".repeat(20) + "\n");
        }
        Deno.stdout.write(this.encoder.encode(content));
        this.system_message += content;
    }

    /** 显示Token使用情况 */
    private showTokenUsage(usage: OpenAI.CompletionUsage) {
        console.log("\n" + "=".repeat(20) + "Token 使用情况" + "=".repeat(20) + "\n");
        console.log(usage);
    }

    /** 更新历史记录 */
    public update_history(user_message: string, system_message: string) {
        const message = "\n user:" + user_message + "\n system:" + system_message;
        this.history.push(message);
        if (this.historyFileName) {
            Deno.writeTextFileSync(this.get_history_path(), JSON.stringify(this.history));
        }
    }

    /** 读取记忆 */
    public async load_memory() {
        if (!API_CONFIG.enable_mermoryy) {
            return;
        }
        console.log("正在读取记忆...");
        this.memory = await Deno.readTextFile("./memory.txt");
        console.log("记忆读取完成:", this.memory);
    }

    /** 读取历史记录 */
    public async load_history(history_name: string) {
        console.log("正在读取历史记录...");
        try {
            this.historyFileName = history_name;
            const historyJson = await Deno.readTextFile(this.get_history_path());
            this.history = JSON.parse(historyJson);
            this.round = this.history.length;
            console.log("历史记录读取完成，当前轮次:", this.round);
        } catch (error) {
            console.log("新建对话历史:", error);
        }
    }

    public save_history(history_name: string) {
        console.log("正在保存历史记录...");
        try {
            this.historyFileName = history_name;
            Deno.writeTextFileSync(this.get_history_path(), JSON.stringify(this.history));
            console.log("历史记录保存完成");
        } catch (error) {
            console.log("保存历史记录失败:", error);
        }
    }
}