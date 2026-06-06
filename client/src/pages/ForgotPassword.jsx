import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import axios from 'axios';

import BaseForm from '../common/components/Form/BaseForm';
import FormInput from '../common/components/Form/FormInput';
import Button from '../common/components/Button';

const step1Schema = yup.object().shape({
  email: yup.string()
    .required('Email is required')
    .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Must be a valid email format (e.g. name@domain.com)'),
});

const step2Schema = yup.object().shape({
  otp: yup.string()
    .required('Verification code is required')
    .matches(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  newPassword: yup.string()
    .required('New password is required')
    .min(6, 'At least 6 characters'),
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const step1Methods = useForm({
    resolver: yupResolver(step1Schema),
    defaultValues: { email: '' }
  });

  const step2Methods = useForm({
    resolver: yupResolver(step2Schema),
    defaultValues: { otp: '', newPassword: '' }
  });

  const handleStep1Submit = async (data) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/forgot-password', {
        email: data.email
      });
      setEmail(data.email);
      setSuccessMsg(response.data?.message || 'Verification OTP sent to your email.');
      setStep(2);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (data) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/reset-password', {
        email,
        otp: data.otp,
        newPassword: data.newPassword
      });
      setSuccessMsg('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to reset password. Please verify the OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow-lg p-4 border-0" style={{ width: '100%', maxWidth: '450px', borderRadius: '14px' }}>
        <div className="text-center mb-4">
          <div className="bg-primary rounded-3 p-3 d-inline-flex align-items-center justify-content-center mb-3 shadow-sm" style={{ width: '50px', height: '50px' }}>
            <i className="bi bi-key text-white fw-bold fs-4" />
          </div>
          <h4 className="fw-bold text-dark mb-1">Recover Password</h4>
          <p className="text-muted small">
            {step === 1 
              ? "Enter your email address to receive a verification OTP code" 
              : `Enter the 6-digit OTP code sent to ${email} and set your new password`
            }
          </p>
        </div>

        {errorMsg && (
          <div className="alert alert-danger py-2 px-3 small border-0 text-center mb-3" style={{ borderRadius: '8px' }}>
            <i className="bi bi-exclamation-octagon me-1" />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success py-2 px-3 small border-0 text-center mb-3" style={{ borderRadius: '8px' }}>
            <i className="bi bi-check-circle me-1" />
            {successMsg}
          </div>
        )}

        {step === 1 ? (
          <BaseForm methods={step1Methods} onSubmit={handleStep1Submit}>
            <FormInput 
              name="email" 
              label="Registered Email Address" 
              placeholder="name@example.com" 
              required={true}
            />
            <Button 
              type="submit" 
              variant="primary" 
              className="w-100 py-2 mt-2" 
              isLoading={loading}
            >
              Send Verification Code
            </Button>
          </BaseForm>
        ) : (
          <BaseForm methods={step2Methods} onSubmit={handleStep2Submit}>
            <FormInput 
              name="otp" 
              label="6-Digit OTP Code" 
              placeholder="123456" 
              required={true}
            />
            <FormInput 
              name="newPassword" 
              label="New Password" 
              type="password" 
              placeholder="Minimum 6 characters" 
              required={true}
            />
            
            <div className="d-flex gap-2 mt-3">
              <Button 
                type="button" 
                variant="light" 
                className="flex-fill py-2"
                onClick={() => {
                  setStep(1);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                disabled={loading}
              >
                Back
              </Button>
              <Button 
                type="submit" 
                variant="primary" 
                className="flex-fill py-2" 
                isLoading={loading}
              >
                Reset Password
              </Button>
            </div>
          </BaseForm>
        )}

        <div className="text-center mt-4 border-top pt-3">
          <Link to="/login" className="text-muted small fw-semibold text-decoration-none">
            <i className="bi bi-arrow-left me-1" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
