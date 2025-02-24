import { OpenAI } from "https://deno.land/x/openai@v4.69.0/mod.ts";

const api_key = "sk-nyfdCahqDRpUt3EULXn7O8Yr5GTAmakA9PlVVeQOEEhZsWrI";
const url = "https://api.lkeap.cloud.tencent.com/v1";
const model = "deepseek-r1";

const openai = new OpenAI({
    apiKey: api_key,
    baseURL: url
});

type CustomDelta = {
    content?: string;
    reasoning_content?: string;
    role?: string;
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
    
    /** 获取历史记录文件路径 */
    public get_history_path() {
        return "./history/" + this.historyFileName + ".json";
    }

    public async sendRequest(input: string) {
        let reasoningContent = ""; // 定义完整思考过程
        let isAnswering = false; // 判断是否结束思考过程并开始回复
        let answerContent = ""; // 定义完整回复
        const show_reasoning_content = true;// 判断是否显示完整思考过程
        let message = "";
        //将记忆前置
        message += this.memory;
        //对话带上历史记录
        if (this.history.length > 0) {
            message += this.history.join("\n");
        }

        const completion = await openai.chat.completions.create({
            model: model, // 可用模型 deepseek-r1 deepseek-v3
            messages: [
                { role: 'user', content: message + " user:" + input, }
            ],
            stream: true,
        });
        console.log("\n" + "=".repeat(20) + "思考过程" + "=".repeat(20) + "\n");
        if (!show_reasoning_content) {
            console.log("思考中...");
        }
        let system_message = "";
        for await (const chunk of completion) {
            // 处理usage信息
            if (!chunk.choices?.length) {
                console.log("\n" + "=".repeat(20) + "Token 使用情况" + "=".repeat(20) + "\n");
                console.log(chunk.usage);
                continue;
            }
            const delta = chunk.choices[0].delta as CustomDelta;
            // 处理空内容情况
            if (!delta.reasoning_content && !delta.content) {
                continue;
            }
            // 处理开始回答的情况
            if (!delta.reasoning_content && !isAnswering) {
                console.log("\n" + "=".repeat(20) + "完整回复" + "=".repeat(20) + "\n");
                isAnswering = true;
            }
            // 处理思考过程
            if (delta.reasoning_content) {
                if (show_reasoning_content) {
                    await Deno.stdout.write(this.encoder.encode(delta.reasoning_content));
                }
                reasoningContent += delta.reasoning_content;
            }
            // 处理回复内容
            else if (delta.content) {
                await Deno.stdout.write(this.encoder.encode(delta.content));
                answerContent += delta.content;
                system_message += delta.content;
            }
        }
        this.round++;
        this.update_history(input, system_message);
    }

    /** 更新历史记录 */
    public update_history(user_message: string, system_message: string) {
        const message = "\n user:" + user_message + "\n system:" + system_message;
        this.history.push(message);
        if (this.historyFileName != "") {
            //更新历史记录
            const json = JSON.stringify(this.history);
            Deno.writeTextFileSync(this.get_history_path(), json);
        }
    }

    /** 读取记忆 */
    public async load_memory() {
        //首先读取固有记忆
        console.log("正在读取记忆...");
        this.memory = await Deno.readTextFile("./memory.txt");
        console.log("记忆读取完成:", this.memory);
    }

    /** 读取历史记录 */
    public async load_history(history_name: string) {
        //首先读取固有记忆
        console.log("正在读取历史记录...");
        try {
            this.historyFileName = history_name;
            const historys_json = await Deno.readTextFile(this.get_history_path());
            //json解析为string类型的数组
            const history_arr = JSON.parse(historys_json);
            this.history.push(...history_arr);
            this.round = this.history.length;
            console.log("历史记录读取完成:", this.history);
            console.log("对话轮次:", this.round);
        } catch (_error) {
            console.log("目标对话不存在,第一轮对话完成后将创建");
        }
    }

}