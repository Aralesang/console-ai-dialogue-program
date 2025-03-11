/** 命令行对话模式主入口 */
import DialogueEngine from "./dialogue_engine.ts";

const command = new DialogueEngine();

async function promptUser() {
    const prompt = "\n用户: ";
    while (true) {
        const input = promptSync(prompt);
        let message = input.toLowerCase();
        let image_path = "";
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
        if (message == '/config') {
            console.log(command.get_api_config());
            continue;
        }
        if (message.includes('/img')){
            //分割内容
            const contents = message.split(" ");
            image_path = contents[1];
            if(contents.length == 3){
                message = contents[2];
            }else{
                message = "首先请告诉我你看到了什么?然后详细描述图片上的内容，如果图片的内容关联到了某些影视,文学,电子游戏等其他可能的内容,也请告知";
            }
        }
        try {
            await command.sendRequest(message, image_path);
        } catch (error) {
            console.error("发生错误:", error);
            if (command.get_api_config().aoutor_loacl) {
                console.log("无法与远程人工智能通信,正在启动本地推理");
                command.set_provider("ollama");
                console.log("当前指定的模型为:", command.get_config().model);
                // 执行shell命令
                const cmd = new Deno.Command("ollama", {
                    args: ["run", command.get_config().model], // 命令参数
                    stdin: "inherit", // 输入配置 (inherit | piped | null)
                    stdout: "piped", // 输出配置
                    stderr: "piped"
                });

                // 执行命令并获取结果
                const { code, success, signal, stdout, stderr } = await cmd.output();

                // 解码输出
                console.log("Exit Code:", code);
                console.log("Success:", success);
                console.log("Signal:", signal);
                console.log("Stdout:", new TextDecoder().decode(stdout));
                console.log("Stderr:", new TextDecoder().decode(stderr));
                if (code != 0) {
                    console.log("本地推理启动失败,请检查ollama是否安装,或者模型名称是否正确");
                    break;
                } else {
                    console.log("本地推理启动完成");
                    console.log("切换模式为:ollama. 当前模型为:", command.get_config().model);
                    await command.sendRequest(input, "");
                }
            }else{
                return;
            }
        }
    }
    console.log("用户交互界面已退出");

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
    const prompt = "\n请输入对话名称\n如果已经存在,则会读取目标对话\n如果不存在,则会创建目标对话\n直接回车表示临时对话\n请输入对话名称: ";
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
    console.log("4. /img 该命令用于在对话中附加图片,需要两个参数 参数1: 图片路径 参数2: 要附带的文本,例如: /img ./img.jpg 请问你在图片上看到了什么?");
}

main();