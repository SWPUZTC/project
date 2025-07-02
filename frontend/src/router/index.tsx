import type { RouteObject } from "react-router-dom"; 
import { lazy } from "react";
import { Result } from "antd";


const Register = lazy(() => import("../pages/register"));
const Login = lazy(() => import("../pages/login"));
const Chat = lazy(() => import("../pages/chat"));

const routes: RouteObject[] = [
    {
        path: "/",
        element: <Login />,
    },
    {
        path: "/register",
        element: <Register />,
    },
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/chat",
        element: <Chat />,
    },
    {
        path: "*",
        element: <Result 
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist."/>,
    },
];

export default routes;