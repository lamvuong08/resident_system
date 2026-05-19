import { Button, Divider, Form, Input, notification } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { MailOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import api, { extractApiError } from '../../utils/api';
import { setAuthSession } from '../../utils/authStorage';

import '../../styles/login.css';

type LoginFormValues = {
  email: string
  password: string
}

const LoginPage = () => {
  const navigate = useNavigate();

  const onFinish = async (values: LoginFormValues) => {
    const { email, password } = values;
    try {
      const res = await api.post('/auth/login', { email, password });
      const data = res.data || {};

      if (data.token) {
        setAuthSession(data.token, {
          email,
          role: data.role,
          name: data.name || '',
        });
      }

      notification.success({ title: 'Đăng nhập thành công' });

      const role = (data.role || '').toUpperCase();
      if (role.includes('ADMIN')) {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (err: any) {
      const msg = extractApiError(err, 'Tài khoản hoặc mật khẩu của bạn không đúng. Xin vui lòng thử lại');
      notification.error({ title: 'Đăng nhập thất bại', description: msg });
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
