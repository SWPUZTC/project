import { Avatar, Image } from "antd";
import { memo } from "react"
import { FileTwoTone } from "@ant-design/icons";
import Audio from "../Audio";

interface recipientInfo {
    text: string;
    src: string;
    imageData?: string[];
    fileData?: string;
    fileName?: string;
    voiceSrc?: string;
}
const recipient = (props: recipientInfo) => {
  const Base64ToBolb = (base64: string, fileName: string) => {
    if (!base64) return;
    const byteString = atob(base64.split(',')[1]);
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new File([ab], fileName, {type: mimeString});
  }
  const FileObj = Base64ToBolb(props.fileData as string, props.fileName as string);
  //console.log(props.fileName);
    //console.log(props.imageData);
    return (
        <div className="self-start">
            <div className="flex flex-row-reverse gap-4 text-xs mt-4 px-4 py-2">
            {(props.text && props.text.length) && (
              <div className="self-center rounded-md shadow-md max-w-[300px] h-fit p-2 bg-blue-500 text-white">
                {props.text}
              </div>
            )}
            <div className="flex flex-col gap-1">
              {props.imageData && (props.imageData.map((item: string) => {
                return (
                  <Image key={item} src={item} className="max-w-[300px] rounded-md shadow-md" alt="image" />
                )
              }))}
            </div>
            {props.fileData && (
                <a 
                className="block flex gap-2 self-center rounded-md shadow-md max-w-[300px] p-2 bg-blue-500 text-white 
                hover:cursor-pointer hover:underline truncate"
                href={URL.createObjectURL(FileObj as File)} download={props.fileName}>
                  <FileTwoTone />
                  <span>{props.fileName}</span>
                </a>
              )}
            {props.voiceSrc && (
              <div className="self-center">
                  <Audio src={props.voiceSrc}/>
              </div>)}
            <Avatar 
            style={{
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            }}
            src={props.src} 
            alt="avatar" size={40}/>
          </div>
        </div>
    )
}
export default memo(recipient);