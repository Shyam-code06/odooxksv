import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import axios from 'axios';

import { useAuth } from '../common/contexts/AuthContext';
import BaseForm from '../common/components/Form/BaseForm';
import FormInput from '../common/components/Form/FormInput';
import Button from '../common/components/Button';

const loginSchema = yup.object().shape({
  username: yup.string().required('Username is required'),
  password: yup.string().required('Password is required'),
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const methods = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { username: '', password: '' }
  });

  const onSubmit = async (data) => {
    setErrorMsg('');
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username: data.username,
        password: data.password
      });

      const { accessToken, refreshToken, user } = response.data.data;
      login(user, accessToken, refreshToken);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Login failed. Please check your credentials or server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow-lg p-4 border-0" style={{ width: '100%', maxWidth: '400px', borderRadius: '14px' }}>
        <div className="text-center mb-4">
          <div className="bg-primary rounded-3 p-3 d-inline-flex align-items-center justify-content-center mb-3 shadow-sm" style={{ width: '50px', height: '50px' }}>
            <i className="bi bi-shuffle text-white fw-bold fs-4" />
          </div>
          <h4 className="fw-bold text-dark mb-1">VendorBridge ERP</h4>
          <p className="text-muted small">Sign in to your administrative account</p>
        </div>

        {errorMsg && (
          <div className="alert alert-danger py-2 px-3 small border-0 text-center mb-3" style={{ borderRadius: '8px' }}>
            <i className="bi bi-exclamation-octagon me-1" />
            {errorMsg}
          </div>
        )}

        <BaseForm methods={methods} onSubmit={onSubmit}>
          <FormInput 
            name="username" 
            label="Username" 
            placeholder="Enter username" 
            required={true}
          />
          <FormInput 
            name="password" 
            label="Password" 
            type="password" 
            placeholder="••••••••" 
            required={true}
          />
          
          <Button 
            type="submit" 
            variant="primary" 
            className="w-100 py-2 mt-2" 
            isLoading={loading}
          >
            Sign In
          </Button>
        </BaseForm>
      </div>
    </div>
  );
};

export default Login;
