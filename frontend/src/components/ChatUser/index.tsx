import { memo } from "react";
import { Avatar } from "antd";
import '@ant-design/v5-patch-for-react-19';
import type { OnlineInfo } from "../../pages/chat";
import formatActiveTime from "../../utils/formattime";

interface Message {
    text?: string;
    sender?: string;
    recipient?: string;
    SendTime?: Date | number;
  }

interface UserItemProps {
    isActive: boolean;
    OnlinePeople?: OnlineInfo;
    LatestMessage: Message;
    isOnline: boolean;
}
const UserItem = (props: UserItemProps) => {
    //console.log(props.LatestMessage);
    //console.log(props.OnlinePeople, props.LatestMessage);
    const className = props.isActive ? 
    'flex items-center pl-2 py-2 hover:bg-gray-200 gap-3 chat-active' 
    : 'flex items-center pl-2 py-2 hover:bg-gray-200 gap-3';
    const OnlineMark = props.isOnline ? "bg-green-500 size-[10px] rounded-full absolute bottom-0 right-0" :
    "bg-gray-400 size-[10px] rounded-full absolute bottom-0 right-0"; 
    return (
        <>
            <div className={className}>
                <div className="relative">
                  <Avatar 
                  src={props.OnlinePeople?.avatarUrl}
                  size={40} 
                  alt="avatar"/>
                  <div className={OnlineMark}></div>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-weight-700 line-clamp-1">{props.OnlinePeople?.username}</span>
                    <span className="text-gray-500 text-xs line-clamp-1">{!props.LatestMessage ? '' : props.LatestMessage.text}</span>
                    <span className="text-gray-500 text-xs">
                      {props.OnlinePeople?.lastSeen ? 
                        `上次活跃: ${formatActiveTime(props.OnlinePeople.lastSeen)}` : 
                        '离线ing'}
                    </span>
                </div>
            </div>
        </>
    );
}

export default memo(UserItem);