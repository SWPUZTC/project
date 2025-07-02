import { memo, useEffect } from 'react';
import { Button, Form, Input, message } from "antd";
import axiosInstance from '../../service';
import { useNavigate } from 'react-router-dom';
import '@ant-design/v5-patch-for-react-19';

interface RegisterProps {
    username?: string;
    password?: string;
}
const Login = () => {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    useEffect(() => {
        return () => {
          // 清理函数，组件卸载时执行
          form.resetFields(); // 重置表单字段
        }
    }, [form]);
    const handleFinish = async (values: RegisterProps) => {
      axiosInstance({
        url: '/login',
        method: 'post',
        data: values,
    }).then(res => {
      message.success('登录成功', 1);
      if(!localStorage.getItem('token')) {
        localStorage.setItem('token', res.data.token);
      }
      navigate('/chat');
    }).catch(err => {
      console.log(err);
      message.error(err.response.data, 1);
    });
    };
    const handleFinishFailed = (errorInfo: any) => {;
        console.error('表单验证失败:', errorInfo);
        message.error('请填写所有必填项', 1);
    };
    return (
        <div className="bg-blue-50 h-screen flex justify-center items-center">
          <div className="bg-white p-10 rounded-lg shadow-lg min-w-[500px]
          w-2/5">
          <h2 className="text-xl text-center mb-8">登录</h2>
          <Form
          onFinish={handleFinish}
          onFinishFailed={handleFinishFailed}
          name="register"
          style={{minWidth: 300, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
          }}
          labelAlign="left"
          initialValues={{remember: true}}
          autoComplete="off">
            <Form.Item<RegisterProps>
            name='username'
            rules={[{required: true, message: '请输入用户名!'}]}>
                <Input
                style={{width: 300}} 
                autoComplete="current-username"
                placeholder="用户名"/>
            </Form.Item>
            <Form.Item<RegisterProps>
            name='password'
            rules={[{required: true, message: '请输入密码!'}]}>
              <Input.Password
              style={{width: 300}} 
              autoComplete="current-password"
              placeholder="密码"/>
            </Form.Item>
            <Form.Item
            label={null}>
              <Button type="primary" htmlType='submit'>登录</Button>
            </Form.Item>
          </Form>
          <div className="text-center text-sm cursor-pointer">
            <a href="/register" className="hover:underline hover:text-blue-500 cursor-pointer">没有账号，点击注册</a>
          </div>
          </div> 
        </div>
    );
};

export default memo(Login);