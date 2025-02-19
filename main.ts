import { OpenAI } from "https://deno.land/x/openai@v4.69.0/mod.ts";
const openai = new OpenAI({
    apiKey: "sk-nyfdCahqDRpUt3EULXn7O8Yr5GTAmakA9PlVVeQOEEhZsWrI",
    baseURL: "https://api.lkeap.cloud.tencent.com/v1"
});

type CustomDelta = {
    content?: string;
    reasoning_content?: string;
    role?: string;
};

// 使用 Deno 的标准输出 API
const encoder = new TextEncoder();
/** 记忆 */
let memory = "";
/** 历史记录 */
const history: string[] = [];
/** 当前对话轮次 */
let round = 0;
/** 当前历史记录文件名 */
let historyFileName = "";

/** 获取历史记录文件路径 */
function get_history_path() {
    return "./history/" + historyFileName + ".json";
}

async function sendRequest(input: string) {
    let reasoningContent = ""; // 定义完整思考过程
    let isAnswering = false; // 判断是否结束思考过程并开始回复
    let answerContent = ""; // 定义完整回复
    const show_reasoning_content = true;// 判断是否显示完整思考过程
    let message = "";
    //将记忆前置
    message += memory;
    //对话带上历史记录
    if (history.length > 0) {
        message += history.join("\n");
    }

    const completion = await openai.chat.completions.create({
        model: "deepseek-r1", // 可用模型 deepseek-r1 deepseek-v3
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
                await Deno.stdout.write(encoder.encode(delta.reasoning_content));
            }
            reasoningContent += delta.reasoning_content;
        }
        // 处理回复内容
        else if (delta.content) {
            await Deno.stdout.write(encoder.encode(delta.content));
            answerContent += delta.content;
            system_message += delta.content;
        }
    }
    round++;
    update_history(input, system_message);
}

async function promptUser() {
    const prompt = "\n用户: ";
    while (true) {
        const input = promptSync(prompt);
        if (input.toLowerCase() === 'exit') {
            console.log("Exiting...");
            break;
        }
        if (input.toLowerCase() == 'show') {
            console.log(history);
            continue;
        }
        await sendRequest(input);
    }
}

// Helper function to read input from the command line
function promptSync(question: string): string {
    const buf = new Uint8Array(1024);
    Deno.stdout.writeSync(new TextEncoder().encode(question));
    const n = Deno.stdin.readSync(buf);
    if (n === null) return '';
    return new TextDecoder().decode(buf.subarray(0, n)).trim();
}


/** 更新历史记录 */
function update_history(user_message: string, system_message: string) {
    const message = "\n user:" + user_message + "\n system:" + system_message;
    history.push(message);
    if (historyFileName != "") {
        //更新历史记录
        const json = JSON.stringify(history);
        Deno.writeTextFileSync(get_history_path(), json);
    }
}

/** 主入口 */
async function main() {
    //首先读取固有记忆
    console.log("正在读取记忆...");
    memory = await Deno.readTextFile("./memory.txt");
    console.log("记忆读取完成:", memory);

    const prompt = "\n请输入对话名称\n如果已经存在,则会读取目标对话\n如果不存在,则会创建目标对话\n直接回车表示使用默认名称创建新对话\n请输入对话名称: ";
    const input = promptSync(prompt);
    //如果当前对话轮次为0，且当前历史记录名不为空，读取历史记录
    if (input != "") {
        historyFileName = input;
        //检查目标文件是否存在
        try {
            Deno.statSync(get_history_path());
            const historys_json = await Deno.readTextFile(get_history_path());
            //json解析为string类型的数组
            const history_arr = JSON.parse(historys_json);
            history.push(...history_arr);
            round = history.length;
            console.log("读取历史记录完成:", history);
            console.log("当前对话轮次:", round);
        } catch (_error) {
            console.log("目标对话不存在,第一轮对话完成后将创建");
        }
    } else {
        //以当前时间戳命名对话历史文件
        // historyFileName = new Date().getTime().toString();
        // console.log("未输入对话名称,默认使用当前时间戳命名:", historyFileName);

        //没有命名则视为临时回话，不进行记录
        console.log("未输入对话名称,本次对话为临时会话,将不进行记录");
    }

    promptUser();
}

main();