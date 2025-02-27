/** 命令行对话模式主入口 */
import DialogueEngine from "./dialogue_engine.ts";

const command = new DialogueEngine();

async function promptUser() {
    const prompt = "\n用户: ";
    while (true) {
        const input = promptSync(prompt);
        const message = input.toLowerCase();
        if (message === '/exit') {
            console.log("Exiting...");
            break;
        }
        if (message == '/show') {
            console.log(command.history);
            continue;
        }
        if (message == '/save') {
            show_save();
            continue;
        }
        if (message == '/help') {
            show_help();
            continue;
        }
        await command.sendRequest(input);
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

/** 主入口 */
async function main() {
    console.log("欢迎使用命令行对话模式");
    //首先读取固有记忆
    await command.load_memory();
    const prompt = "\n请输入对话名称\n如果已经存在,则会读取目标对话\n如果不存在,则会创建目标对话\n直接回车表示使用默认名称创建新对话\n请输入对话名称: ";
    const input = promptSync(prompt);
    //如果当前对话轮次为0，且当前历史记录名不为空，读取历史记录
    if (input != "") {
        await command.load_history(input);
    } else {
        //没有命名则视为临时回话，不进行记录
        console.log("未输入对话名称,本次对话为临时会话,将不进行记录");
    }
    console.log("输入 /help 查看帮助");

    promptUser();
}

/** 显示存档界面 */
async function show_save() {
    const prompt = "将对话另存为一个新的历史记录\n请输入对话名称:";
    const input = promptSync(prompt);
    //如果当前对话轮次为0，且当前历史记录名不为空，读取历史记录
    if (input != "") {
        await command.save_history(input);
    } else {
        //没有命名则视为临时回话，不进行记录
        console.log("未输入对话名称,本次对话为临时会话,将不进行记录");
    }
}

/** 显示帮助界面 */
function show_help() {
    console.log("命令列表");
    console.log("1. /exit 退出");
    console.log("2. /show 显示历史记录");
    console.log("3. /save 保存当前对话,处于临时聊天模式时该命令会使得临时聊天变为永久聊天");
}

main();