import React, { memo, useState, useRef, useEffect, useCallback } from "react";
import '@ant-design/v5-patch-for-react-19';
import { 
    SmileOutlined, 
    FolderOutlined, 
    PictureOutlined, 
    AudioOutlined,
    AudioTwoTone,
    SearchOutlined,
    UserOutlined,
    PoweroffOutlined,
 } from "@ant-design/icons";
import { Upload, Button, Input, Popover, Avatar, message, Spin } from "antd";
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import UserItem from "../../components/ChatUser";
import axiosInstance from "../../service";
import Sender from "../../components/Sender";
import Recipient from "../../components/Recipient";
import VoiceRecorder from "../../utils/AudioRecoder";

export interface OnlineInfo {
    userId: string;
    username: string;
    avatarUrl?: string;
    lastSeen?: number; 
}

interface message {
  text?: string;
  sender: string;
  recipient: string;
  SendTime: number;
  image?: string[];
  file?: string;
  fileName?: string;
  voice?: string;
}
const Chat = () => {
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [isChat, setIsChat] = useState<number>(0)
    const [imgUrl, setImgUrl] = useState<any>();
    const [OnLinePeople, setOnlinePeople] = useState<OnlineInfo[]>([]);
    const [userId, setUserId] = useState<string>('');
    const [selectUserId, setSelectUserId] = useState<string>('');
    const [messages, setMessages] = useState<Object[]>([]);
    const [RecipientImgUrl, setRecipientImgUrl] = useState<Record<string, string>>({});
    const MessageDivRef = useRef<HTMLDivElement>(null);
    const [value, setValue] = useState<string>('');
    const FileRef = useRef<HTMLInputElement>(null); 
    const PicRef = useRef<HTMLInputElement>(null);
    const timeRef = useRef<number | null>(null);
    const KeyBroadTrigger = useRef<HTMLDivElement>(null);
    const voiceRecorder = useRef<VoiceRecorder | null>(null);
    const handleTextAreaChange = (e: any) => setValue(e.target.value);
    const [isloading, setIsloading] = useState<boolean>(false);
    const AvatarUrlCache = useRef<Record<string, string>>({});
    const MessageCache = useRef<message[]>(null);
    const [microphone, setMicrophone] = useState<boolean>(false);
    const [AllofPeople, setAllofPeople] = useState<any[]>([]);
    const [Speaking, setSpeaking] = useState<boolean>(false);
    useEffect(() => {
      axiosInstance.get('/people').then(res => {
        //console.log(res.data);
        setAllofPeople(res.data);
      })
    }, []); 
    
    useEffect(() => {
      //当组件挂载时发送消息自动跳转到底部
      if(MessageDivRef.current) {
        MessageDivRef.current.scrollTop = MessageDivRef.current.scrollHeight;
        //平滑滑动
        MessageDivRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }
    }, [messages]);

    useEffect(() => {
      axiosInstance.get('/profile').then(res => {
        setUserId(res.data.userId);
        AvatarUrlCache.current[res.data.userId] = res.data.avatarUrl || '';
        return axiosInstance.get('/avatar', {params: {userId: res.data.userId}})
      }).then(res => {
        setImgUrl(res.data.avatarUrl);
      }, reason => {
        console.error('获取头像失败:', reason);
        setImgUrl('');
      })
    }, []);

    useEffect(() => {
      if(!userId) return;
      setOnlinePeople(OnLinePeople.filter(item => item.userId !== userId));
    }, [userId]);

    useEffect(() => {
      if(!OnLinePeople || !userId) return ;
      const newOnlinePeople = OnLinePeople.filter(item => item.userId!== userId);
      //console.log('当前选中的用户id为',  newOnlinePeople[isChat]?.userId);
      setSelectUserId(newOnlinePeople[isChat]?.userId || '');
    }, [isChat, OnLinePeople, userId]);

    useEffect(() => {
  // 首次加载或有新用户加入时执行
  if (OnLinePeople && OnLinePeople.length > 0 && userId) {
    // 筛选出需要请求头像的用户 ID（排除当前用户和已缓存的用户）
    const needFetchIds = OnLinePeople.map(item => item.userId)
      .filter(id => id !== userId && !AvatarUrlCache.current[id]);
    if (needFetchIds.length > 0) {
      // 并行请求新用户的头像
      Promise.all(needFetchIds.map(id => {
        return axiosInstance.get('/avatar', { params: { userId: id } })
          .then(res => ({ id, avatarUrl: res.data.avatarUrl }))
          .catch(() => ({ id, avatarUrl: '' }));
      })).then(results => {
        // 更新头像映射
        const newAvatars = { ...AvatarUrlCache.current };
        results.forEach(item => {
          newAvatars[item.id] = item.avatarUrl;
        });
        setRecipientImgUrl(newAvatars);
      });
    }
  }
    }, [OnLinePeople, userId]);
    
    useEffect(() => {
  if(!selectUserId || !userId || selectUserId === userId) return;
  setIsloading(true);
  //console.log('被选中的用户id为', selectUserId);
  axiosInstance.get('/messages', {params: {from: userId, to: selectUserId}}).then(res => { 
    //console.log(res.data); 
    setMessages(res.data); 
    MessageCache.current = res.data;
    setIsloading(false);
  }).catch(err => { 
    console.error(err); 
    setMessages([]); 
    setIsloading(false);
  });
    }, [selectUserId, userId]);

    useEffect(() => {
      KeyBroadTrigger.current?.focus();
    })

    const handleImgUpload = useCallback((info: any) => {
      if (info.file.status === 'done') {
      if (info.file.response && info.file.response.success) {
      setImgUrl(info.file.response.data.url); // 获取服务器返回的URL
    } else {
      message.error('上传失败');
    }
  }
    }, [userId]);

    const initWebSocket = useCallback(() => {
  try {
    const newWs = new WebSocket('ws://localhost:3000');
    setWs(newWs);
    
    // 连接打开时的处理
    newWs.addEventListener('open', () => {
      console.log('WebSocket连接已建立');
    });
    
    // 接收消息的处理
    newWs.addEventListener('message', handleMessage);
    
    // 连接关闭时的处理
    newWs.addEventListener('close', () => {
      console.log('WebSocket连接已关闭');
      // 尝试在5秒后重新连接
      setTimeout(() => {
        if (newWs.readyState === WebSocket.CLOSED) {
          console.log('尝试重新连接...');
          initWebSocket();
        }
      }, 5000);
    });
    
    // 错误处理
    newWs.addEventListener('error', (error) => {
      console.error('WebSocket错误:', error);
    });
    
    return newWs;
  } catch (error) {
    console.error('创建WebSocket连接失败:', error);
    return null;
  }
    }, []);

    useEffect(() => {
  const wsInstance = initWebSocket();
  // 组件卸载时清理
  return () => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      wsInstance.close();
    }
  };
    }, [initWebSocket]);

    const sendMessage = useCallback(() => {
      if(!userId || !selectUserId || userId === selectUserId) {
        message.warning('请选择一个聊天对象');
        return ;
      }
      ws?.send(JSON.stringify({
        recipient: selectUserId,
        sender: userId,
        text: value || null,
        SendTime: Date.now(),
      }))
      //console.log(userId, selectUserId);
      if(value) {
        setMessages(prev => ([...prev, {text: value, sender: userId, 
        recipient: selectUserId, SendTime: Date.now()}
        ]));
        MessageCache.current = [...MessageCache.current || [], {text: value, sender: userId,
          recipient: selectUserId, SendTime: Date.now()}
        ];
        setValue('');
      }
    }, [userId, selectUserId, value, ws])

    const handleMessage = useCallback((e: any) => {
      const MessageData = JSON.parse(e.data)
      if(MessageData.text || MessageData.image || MessageData.file || MessageData.voice) {
        //console.log(MessageData);
        if(MessageData.sender === MessageData.recipient) return ;
        setMessages(prev => [...prev, {...MessageData}]);
        MessageCache.current = [...MessageCache.current || [], MessageData];
        return ;
      }
      try {
          const data: OnlineInfo[] = JSON.parse(e.data);
          // 过滤掉重复的用户ID
          const uniqueUsers = new Map<string, OnlineInfo>();
          data.forEach(user => {
              // 如果用户ID不存在或者当前用户的lastSeen更新，则更新用户信息
              if (!uniqueUsers.has(user.userId) || 
                  (user.lastSeen && uniqueUsers.get(user.userId)?.lastSeen && 
                   user.lastSeen > uniqueUsers.get(user.userId)!.lastSeen!)) {
                  uniqueUsers.set(user.userId, user);
              }
          });
          // 转换为数组并按最后活跃时间排序
          const sortedUsers = Array.from(uniqueUsers.values())
              .sort((a, b) => {
                  // 如果lastSeen存在，按时间排序；否则保持原顺序
                  if (a.lastSeen && b.lastSeen) {
                      return b.lastSeen - a.lastSeen;
                  }
                  return 0;
              });
          setOnlinePeople(sortedUsers);
      } catch (error) {
          console.error('解析消息数据时出错:', error);
      }
    }, [selectUserId, userId]);

    const handleSendImage = useCallback((e: any) => {
      const files = e.files;
      if(!e.files.length || !userId || !selectUserId || userId === selectUserId) {
        return ;
      }
      //console.log(e.files);
      for(const file of files) {
        if(file.size > 1024 * 1024 * 5) {
          message.warning('上传图片不能超过5MB，如果需要请在文件功能中上传');
          return ;
        }
      }   
      const promises = Array.from(files).map((file: any) => {
        //console.log(file);
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });
    
      Promise.all(promises).then(imageUrlList => {
        // 创建消息对象
        const imageMessage = {
          sender: userId,
          recipient: selectUserId,
          image: imageUrlList,
          SendTime: Date.now()
        };
        //console.log(imageMessage);
        // 通过WebSocket发送图片
        ws?.send(JSON.stringify(imageMessage));
        
        // 更新本地消息列表
        setMessages(prev => [...prev, imageMessage]);
        MessageCache.current = [...MessageCache.current || [], imageMessage];
      });
    }, [userId, selectUserId, ws]);

    const handleSendFile = useCallback((e: any) => {
      const file = e.target.files[0];
      //console.log(file);
      if(!file ||!userId ||!selectUserId || userId === selectUserId) {
        return ;
      }
      if(file.size > 1024 * 1024 * 300) {
        message.warning('上传文件不能超过300MB');
        return ;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if(reader.readyState === FileReader.DONE) {
          const fileData = reader.result as string;
          const fileMessage = {
            sender: userId,
            recipient: selectUserId,
            file: fileData,
            fileName: file.name,
            SendTime: Date.now()
          };
          ws?.send(JSON.stringify(fileMessage));
          setMessages(prev => [...prev, fileMessage]);
          MessageCache.current = [...MessageCache.current || [], fileMessage];
        }
      }
      reader.readAsDataURL(file);
    }, [userId, selectUserId, ws]);

    const handleSpaceUp = useCallback((e: React.KeyboardEvent) => {
  if (!microphone) return;
  if (e.key === ' ') {
    // 清除延时器，如果还没开始录音就取消
    if (timeRef.current) {
      clearTimeout(timeRef.current);
      timeRef.current = null;
    }
    // 如果正在录音，则停止录音
    if (Speaking) {
      stopVoiceRecording();
      //message.info('录音已结束');
    }
  }
    }, [microphone, Speaking]);

    const startVoiceRecording = useCallback(async () => {
  if (!userId || !selectUserId || userId === selectUserId) {
    return;
  }
  
  try {
    voiceRecorder.current = new VoiceRecorder();
    const hasPermission = await voiceRecorder.current.startRecording();
    if (!hasPermission) {
      message.warning('请允许浏览器使用麦克风');
      return;
    }
    setSpeaking(true);
    //message.success('开始录音');
  } catch (error) {
    message.error('录音启动失败');
    console.error('录音启动失败:', error);
  }
    }, [userId, selectUserId]);

    const handleSpaceDown = useCallback((e: React.KeyboardEvent) => {
  if (!microphone) return;
  if (e.key === ' ') {
    e.preventDefault();
    // 防止重复按下
    if (timeRef.current || Speaking) return;
    
    // 设置延时器，1秒后开始录音
    timeRef.current = setTimeout(() => {
      startVoiceRecording();
      timeRef.current = null;
    }, 1000);
  }
    }, [microphone, Speaking, startVoiceRecording]);

    const stopVoiceRecording = useCallback(async () => {
  if (!voiceRecorder.current || !Speaking) return;
  
  try {
    const audioBlob = await voiceRecorder.current.stopRecording();
    setSpeaking(false);
    if (audioBlob.size === 0) {
      message.warning('没有录制到声音');
      return;
    }

    const convertBlobToBase64 = (blob: Blob): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    };

    const base64Audio = await convertBlobToBase64(audioBlob);
    const voiceMessage = {
      sender: userId,
      recipient: selectUserId,
      voice: base64Audio,
      SendTime: Date.now()
    };

    ws?.send(JSON.stringify(voiceMessage));
    setMessages(prev => [...prev, voiceMessage]);
    MessageCache.current = [...MessageCache.current || [], voiceMessage];
    message.success('语音已发送');
  } catch (error) {
    setSpeaking(false);
    message.error('录音处理失败');
    console.error('录音处理失败:', error);
  }
    }, [userId, selectUserId, ws, Speaking]);

// 移除原来的 useEffect，因为逻辑已经在按键事件中处理
// 如果需要清理资源，可以在组件卸载时处理
    useEffect(() => {
  return () => {
    // 组件卸载时清理资源
    if (timeRef.current) {
      clearTimeout(timeRef.current);
      timeRef.current = null;
    }
    if (voiceRecorder.current?.isRecording()) {
      voiceRecorder.current.stopRecording();
      voiceRecorder.current = null;
    }
  };
  }, []);
    return (
        <div className="flex min-h-screen overflow-hidden">
            <div className="bg-gray-50 w-1/5 min-h-screen min-w-[300px] flex">
              <div className="flex flex-col w-1/5 bg-gray-100 min-h-screen relative">
                <div className="flex flex-col gap-4 items-center pt-8 min-h-[300px]">
                  <Upload 
                  data={{userId}}
                  onChange={handleImgUpload}
                  name="avatar"
                  accept="image/png, image/jpeg"
                  className="hover:cursor-pointer"
                  showUploadList={false}
                  action={'http://localhost:3000/avatar'}
                  >
                    {imgUrl ? <Avatar src={imgUrl} size={40} icon={<UserOutlined />} /> : 
                    <Avatar size={40} icon={<UserOutlined />}/>}
                  </Upload>
                  <div
                  className="absolute bottom-4"
                  >
                    <PoweroffOutlined 
                     onClick={() => {
                        if(ws && ws.readyState === WebSocket.OPEN) 
                          ws.close();
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                      }}
                    className="icon"/>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 flex-col w-4/5 min-h-screen">
                    <div className="flex gap-3 pl-2 pr-2 pt-4 items-center">
                        <Input placeholder="搜索" style={{
                          fontSize: '12px',
                        }}/>
                        <SearchOutlined className="hover:cursor-pointer"/>
                    </div>
                    <div className="flex flex-col border-t-1 border-gray-200">
                      {AllofPeople.filter(item => item._id !== userId).map((user: any ,index: number) => {
                        const isUserOnline = OnLinePeople.some(onlineUser => onlineUser.userId === user._id);
                        //console.log(MessageCache.current);
                        //console.log(OnLinePeople);
                        //console.log(`${user.username}`, isUserOnline);
                        const MessgaeContent = MessageCache.current?.filter(item => {
                          return (item.sender === userId && item.recipient === user._id) ||
                          (item.sender === user._id && item.recipient === userId);
                        }).slice(-1)[0] || {};
                        return (
                          <div 
                          key={index}
                          className="relative"
                          onClick={(e) => {
                            e.preventDefault();
                            setIsChat(index)
                            setSelectUserId(user._id)
                            if(userId && user._id && userId !== user._id) {
                              if(MessageCache.current) {
                                if(MessageCache.current.some(item => {
                                  return item.sender === userId && item.recipient === user._id
                                })) return;
                              }
                              axiosInstance.get('/messages', {params: {from: userId, to: user._id}}).then(res => { 
                                setMessages(res.data)
                                MessageCache.current = res.data;
                              }).catch(err => { 
                                console.error('获取消息失败:', err); 
                                setMessages([]);
                                MessageCache.current = [];
                              });
                            }
                          }}>
                            <UserItem 
                            isOnline = {isUserOnline}
                            LatestMessage={isUserOnline ? MessgaeContent : {}}
                            isActive={index === isChat} 
                            OnlinePeople={OnLinePeople.find(item => item.userId === user._id) || user}/>
                          </div>
                        );
                      })}
                    </div>
              </div>
            </div>
            <div className="w-4/5 flex flex-col min-h-screen">
            <div className="h-[80vh] max-h-[80vh] overflow-y-auto flex flex-col items-end relative">
              {isloading ? <Spin size="large" fullscreen={true}/> : <> {messages.map((item: any, index: number) => {
                //console.log(messages);
                if(item.sender === userId) {
                  return (
                    <Sender text={item.text} src={imgUrl} 
                    key={index} imageData={item.image ? item.image : []}
                    fileData={item.file ? item.file : null}
                    fileName={item.fileName ? item.fileName : ''}
                    voiceSrc={item.voice ? item.voice : ''}/>
                  )
                }
                else {
                  return (
                    <Recipient text={item.text} src={RecipientImgUrl[item.sender] || ''} 
                    key={index} imageData={item.image ? item.image : []}
                    fileData={item.file ? item.file : null}
                    fileName={item.fileName ? item.fileName : ''}
                    voiceSrc={item.voice ? item.voice : ''}/>
                );
                }
              })}</>}
              <div ref={MessageDivRef}></div>
              </div>
              <div className="h-1/5 border-t-1 border-gray-200 flex flex-col mt-4 relative">
                <div className="flex">
                    {/* emoji部分 */}
                    <div className="pl-4 pt-2 hover: cursor-pointer">
                        <Popover
                        content={<Picker data={data} onEmojiSelect={(emoji: any) => setValue(value + emoji.native)} />}
                        trigger={'hover'}
                        className='hover-popover'>
                            <SmileOutlined />
                        </Popover>
                    </div>
                    {/* 文件部分 */}
                    <div className="pl-4 pt-2 hover: cursor-pointer">
                        <Popover
                        trigger={'hover'}
                        content={<div>文件</div>}
                        className='hover-popover'>
                          <FolderOutlined onClick={() => FileRef.current?.click()}/>
                          <input name="file" 
                          type="file"
                          ref={FileRef}
                          className="hidden"
                          onChange={handleSendFile}
                          />
                        </Popover>
                    </div>
                    {/* 图片部分 */}
                    <div className="pl-4 pt-2 hover: cursor-pointer">
                        <Popover
                        trigger={'hover'}
                        content={<div>图片</div>}
                        className='hover-popover'>
                          <PictureOutlined onClick={() => PicRef.current?.click()}/>
                          <input name="file" 
                          multiple={true}
                          accept="image/*"
                          type="file"
                          ref={PicRef}
                          className="hidden"
                          onChange={(e: any) => handleSendImage(e.target)}
                          />
                        </Popover>
                    </div>
                    {/* 语音部分 */}
                    <div className="pl-4 pt-2 hover: cursor-pointer"
                    onClick={() => setMicrophone(!microphone)}>
                        <Popover
                        trigger={'hover'}
                        content={<div>语音</div>}
                        className='hover-popover'>
                          <AudioOutlined />
                        </Popover>
                    </div> 
                </div>
                {microphone ? (
                  <div 
                  ref={KeyBroadTrigger}
                  onKeyDown={handleSpaceDown}
                  onKeyUp={handleSpaceUp}
                  tabIndex={0}
                  className="h-full text-4xl flex items-center justify-center focus:outline-none">
                    <div className="flex flex-col gap-2 items-center justify-center">
                      <AudioTwoTone
                      onClick={() => {
                        setMicrophone(!microphone)
                      }}/>
                      <span className="text-xs">按住空格开始说话，松开结束</span>
                    </div>
                  </div>
                ) : (
                  <>
                  <div className="h-full">
                    <Input.TextArea 
                    onKeyDown={(e: any) => {
                      if(e.key === 'Enter') {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="请输入内容" 
                    value={value}
                    onChange={handleTextAreaChange}
                    style={{
                        border: "none",
                        height: "100%",
                        boxShadow: "none",
                        resize: "none",
                        display: 'block',
                        position: 'relative',
                    }}/>
                </div>
                <div className="flex justify-end align-center py-2">
                    <Button 
                    onClick={sendMessage}
                    type="primary"
                    style={{
                        fontSize: '12px',
                        padding: '2px 10px',
                        marginRight: '20px',
                    }}>发送</Button>
                </div>
                </>
                )}
              </div>
            </div>
        </div>
    );
};

export default memo(Chat);