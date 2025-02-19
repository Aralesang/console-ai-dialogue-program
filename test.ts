/** 当前历史记录文件名 */
const historyFileName = "星辰的孩子在逻辑尽头重生";
/** 历史文件路径 */
const historys_path = "./historys/" + historyFileName + ".json";

const historys_json = await Deno.readTextFile(historys_path);
//json解析为string类型的数组
const history_arr = JSON.parse(historys_json);
console.log(history_arr.length);
const history: string[] = []
history.push(...history_arr);
console.log(history.length);
console.log(history);
