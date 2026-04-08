import React from 'react';
import { Button, Divider, Form, Input, notification } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { MailOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import api from '../utils/api';

import '../styles/login.css';

const LoginPage = () => {
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    const { email, password } = values;
    try {
      const res = await api.post('/auth/login', { email, password });
      const data = res.data || {};

      if (data.token) localStorage.setItem('token', data.token);
      notification.success({ message: 'Đăng nhập thành công' });

      const user = { email };
      localStorage.setItem('user', JSON.stringify(user));

      navigate('/home');
    } catch (err: any) {
      const msg = err.response?.data || err.message || 'Vui lòng kiểm tra lại thông tin';
      notification.error({ message: 'Đăng nhập thất bại', description: msg });
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="auth-brand">TCONS RESIDENT</div>
        <div className="login-title">Đăng nhập để tiếp tục trải nghiệm</div>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Vui lòng nhập email!' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="Nhập email..." />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div className="login-links">
          <Link to="/">
            <ArrowLeftOutlined /> Trang chủ
          </Link>
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </div>

        <Divider />

        <div className="register-text">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;