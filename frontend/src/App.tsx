import { memo, useEffect } from "react"
import { Suspense } from "react";
import { useRoutes } from "react-router-dom";
import routes from "./router";
import '@ant-design/v5-patch-for-react-19';
import { Spin } from "antd";
import { useNavigate } from "react-router-dom";
const App = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if(!localStorage.getItem('token')) navigate('/login'); 
  }, [navigate]);
  return (
    <>
      <div>
        <Suspense fallback={<Spin fullscreen={true} percent={'auto'}/>}>
          <div>{useRoutes(routes)}</div>
        </Suspense>
      </div>    
    </>
  )
}
export default memo(App);
