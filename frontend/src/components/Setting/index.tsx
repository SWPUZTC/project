import { memo } from "react"
import { 
    DeleteOutlined,
    ToTopOutlined,
 } from "@ant-design/icons"

const Setting = () => {
    return (
        <div className="rounded-md text-shadow-md bg-white border-1 border-gray-300 p-1">
            <div className="flex items-center gap-2 text-xs
            hover:bg-gray-200 cursor-pointer hover-icon py-1">
              <ToTopOutlined className="icon"/>
              <span>置顶</span>
            </div>
            <div className="flex items-center gap-2 text-xs
            hover:bg-gray-200 cursor-pointer hover-icon py-1">
              <DeleteOutlined className="icon"/>
              <span>删除聊天列表</span>
            </div>
        </div>
    )
}

export default memo(Setting);