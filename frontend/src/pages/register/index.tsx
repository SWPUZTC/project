import { Button, Form, Input } from "antd";
import { memo, useState } from "react";
import axiosInstance from "../../service";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import '@ant-design/v5-patch-for-react-19';

interface RegisterProps {
  username?: string;
  password?: string;
}

const Register = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const handleFinish = async (values: RegisterProps) => {
    const {username, password} = values;
    axiosInstance({
      url: '/register',
      method: 'post',
      data: {username, password},
    }).then(res => {
      localStorage.setItem('token', res.data.token);
      message.success('注册成功', 1);
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    }).catch(err => {
      if(err.status === 409) message.error('用户名已存在，请更换用户名', 1);
      else message.error('注册失败，请稍后再试', 1);
    })
  }
  const handleFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  }
  const handleValueChange = (value: RegisterProps) => {
    setUsername(value.username || username);
    setPassword(value.password || password);
  }
    return (
        <div className="bg-blue-50 h-screen flex justify-center items-center">
          <div className="bg-white p-10 rounded-lg shadow-lg min-w-[500px]
          w-2/5">
          <h2 className="text-xl text-center mb-8">注册登录</h2>
          <Form
          onValuesChange={handleValueChange}
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
                <Input value={username} 
                style={{width: 300}} 
                autoComplete="current-username"
                placeholder="用户名"/>
            </Form.Item>
            <Form.Item<RegisterProps>
            name='password'
            rules={[{required: true, message: '请输入密码!'}]}>
              <Input.Password value={password} 
              style={{width: 300}} 
              autoComplete="current-password"
              placeholder="密码"/>
            </Form.Item>
            <Form.Item
            label={null}>
              <Button type="primary" onClick={() => {
                handleFinish({username, password});
              }}>注册</Button>
            </Form.Item>
          </Form>
          <div className="text-center text-sm">
            <a href="/login" className="hover:underline hover:text-blue-500 cursor-pointer">已有账号，点击登录</a>
          </div>
          </div> 
        </div>
    );
}

export default memo(Register);