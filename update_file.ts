// upload.ts
const API_URL = "https://freeimage.host/api/1/upload";
const API_KEY = "6d207e02198a847aa98d0a2a901485a5";
//const IMG_PATH = "/Users/dengxiaolei/Documents/img1.jpg";

export async function uploadImage(filePath: string) {
  // 1. 读取本地文件
  const fileContent = await Deno.readFile(filePath);
  const fileName = filePath.split("/").pop() || "image.jpg";

  // 2. 创建 multipart/form-data 边界
  const boundary = "----WebKitFormBoundary" + Math.random().toString(16).substr(2);

  // 3. 构建请求体
  const body = new Uint8Array([
    ...encodeMultipartField(boundary, "key", API_KEY),
    ...encodeMultipartField(boundary, "action", "upload"),
    ...encodeFilePart(boundary, "source", fileContent, fileName),
    ...new TextEncoder().encode(`--${boundary}--\r\n`)
  ]);

  // 4. 发送请求
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`
    },
    body
  });

  // 5. 处理响应
  const result = await response.json();
  if (result.status_code === 200) {
    return result.image.url;
  } else {
    console.error("Upload failed:", result);
    return null;
  }
}

// 辅助函数：编码普通表单字段
function encodeMultipartField(boundary: string, name: string, value: string): Uint8Array {
  const data = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="${name}"\r\n\r\n`,
    `${value}\r\n`
  ].join("");
  return new TextEncoder().encode(data);
}

// 辅助函数：编码文件字段
function encodeFilePart(boundary: string, name: string, content: Uint8Array, fileName: string): Uint8Array {
  const header = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="${name}"; filename="${fileName}"\r\n`,
    `Content-Type: image/jpeg\r\n\r\n`
  ].join("");

  const footer = new TextEncoder().encode("\r\n");
  
  return new Uint8Array([
    ...new TextEncoder().encode(header),
    ...content,
    ...footer
  ]);
}

// 使用示例（需要替换为实际文件路径）
//uploadImage(IMG_PATH).catch(console.error);