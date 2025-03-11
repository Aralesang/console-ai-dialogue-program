import { uploadImage } from "./update_file.ts";

let get = await uploadImage("./img1.jpg");
console.log(get);