// 配置中心
export const API_CONFIG = {
    provider: "openai",// "ollama",  // 可切换为 "openai" 或 "ollama"
    openai: { //推理模型
        apiKey: "sk-nyfdCahqDRpUt3EULXn7O8Yr5GTAmakA9PlVVeQOEEhZsWrI",
        baseURL: "https://api.lkeap.cloud.tencent.com/v1",
        model: "deepseek-r1" // 可用模型: deepseek-r1 deepseek-v3 qwen/qwen2.5-vl-72b-instruct:free
    },
    ollama: { //本地推理模型
        baseURL: "http://localhost:11434",  // Ollama默认地址
        model: "deepseek-r1:latest"  // 可用模型: deepseek-r1:latest llama3.2:latest
    },
    img_model: { //视觉识别模型
        apiKey: "sk-8af3cfddd72b48aaa81662d5772a4965",
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model: "qwen2.5-vl-72b-instruct"
    },
    show_reasoning_content: true,// 是否显示推理内容,该配置仅限deepseek-r1模型时有效
    enable_multi_turn: true, // 是否启用多轮对话
    enable_mermoryy: true, // 是否启用记忆
    aoutor_loacl: false //自动切换本地推理
};